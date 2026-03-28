import { NextRequest }       from "next/server";
import { requireSession }    from "@/lib/auth";
import { getAnthropicClient, MODELS } from "@/lib/ai/claude";
import { ADVISOR_TOOLS, executeTool, type ToolInput } from "@/lib/ai/tools";
import type Anthropic from "@anthropic-ai/sdk";

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ─── Agentic loop with streaming ──────────────────────────────────────────────

async function runAgentLoop(
  messages:    Anthropic.MessageParam[],
  orgId:       string,
  orgName:     string,
  useThinking: boolean,
  emit:        (chunk: string) => void,
) {
  const claude    = getAnthropicClient();
  let   loopMsgs  = [...messages];
  const maxIter   = 8; // prevent infinite tool loops

  for (let iter = 0; iter < maxIter; iter++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model:      MODELS.opus,
      max_tokens: useThinking ? 16000 : 8096,
      system: `You are the SaaS Advisor for ${orgName}. You have access to tools that query their live SaaS data.
Always use tools to get real data before answering — never make up numbers.
Be concise, specific, and action-oriented. Format numbers as currency where appropriate.
When you find waste or risk, quantify it in dollars. Prioritize highest-impact recommendations.`,
      tools:    ADVISOR_TOOLS,
      messages: loopMsgs,
    };

    if (useThinking) {
      params.thinking = { type: "enabled", budget_tokens: 8000 };
    }

    const stream = claude.messages.stream(params);

    // Accumulated content for this turn
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentBlocks: any[]             = [];
    const toolUseBlocks: { id: string; name: string; inputJson: string }[] = [];
    let   currentBlockIdx = -1;

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        currentBlockIdx++;
        const block = event.content_block;

        if (block.type === "thinking") {
          contentBlocks.push({ type: "thinking", thinking: "" });
          emit(sseEvent({ type: "thinking_start" }));
        } else if (block.type === "text") {
          contentBlocks.push({ type: "text", text: "" });
        } else if (block.type === "tool_use") {
          contentBlocks.push({ type: "tool_use", id: block.id, name: block.name, input: {} } as Anthropic.ToolUseBlock);
          toolUseBlocks.push({ id: block.id, name: block.name, inputJson: "" });
          emit(sseEvent({ type: "tool_start", name: block.name }));
        }
      }

      if (event.type === "content_block_delta") {
        const delta = event.delta;
        const block = contentBlocks[currentBlockIdx];

        if (delta.type === "thinking_delta" && block?.type === "thinking") {
          block.thinking += delta.thinking;
          emit(sseEvent({ type: "thinking_delta", delta: delta.thinking }));
        } else if (delta.type === "text_delta" && block?.type === "text") {
          block.text += delta.text;
          emit(sseEvent({ type: "text_delta", delta: delta.text }));
        } else if (delta.type === "input_json_delta") {
          const toolBlock = toolUseBlocks[toolUseBlocks.length - 1];
          if (toolBlock) toolBlock.inputJson += delta.partial_json;
        }
      }

      if (event.type === "content_block_stop") {
        const block = contentBlocks[currentBlockIdx];
        if (block?.type === "thinking") {
          emit(sseEvent({ type: "thinking_end" }));
        }
      }
    }

    const finalMsg = await stream.finalMessage();

    // If no tool use, we're done
    if (finalMsg.stop_reason !== "tool_use" || toolUseBlocks.length === 0) break;

    // Execute each tool and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolBlock of toolUseBlocks) {
      let input: ToolInput = {};
      try { input = JSON.parse(toolBlock.inputJson || "{}"); } catch {}

      emit(sseEvent({ type: "tool_running", name: toolBlock.name }));

      let result: unknown;
      try {
        result = await executeTool(toolBlock.name, input, orgId);
      } catch (err) {
        result = { error: String(err) };
      }

      emit(sseEvent({ type: "tool_done", name: toolBlock.name, summary: summarizeTool(toolBlock.name, result) }));

      toolResults.push({
        type:        "tool_result",
        tool_use_id: toolBlock.id,
        content:     JSON.stringify(result),
      });
    }

    // Append assistant turn + tool results to messages
    loopMsgs = [
      ...loopMsgs,
      { role: "assistant", content: finalMsg.content },
      { role: "user",      content: toolResults },
    ];
  }
}

function summarizeTool(name: string, result: unknown): string {
  if (!result || typeof result !== "object") return "completed";
  if (Array.isArray(result)) return `returned ${result.length} records`;
  const r = result as Record<string, unknown>;
  if (name === "get_saas_overview") return `$${r.monthlySpend}/mo, ${r.totalApps} apps`;
  if (name === "create_alert")      return `created alert: ${r.title}`;
  return "completed";
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireSession(); }
  catch { return new Response("Unauthorized", { status: 401 }); }

  const { messages, useThinking = false } = await req.json() as {
    messages:    Anthropic.MessageParam[];
    useThinking: boolean;
  };

  if (!messages?.length) return new Response("messages required", { status: 400 });

  const org = await import("@/lib/db").then(({ db }) =>
    db.organization.findUnique({ where: { id: session.orgId }, select: { name: true } })
  );
  const orgName = org?.name ?? "your organization";

  const encoder  = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const emit = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      try {
        await runAgentLoop(messages, session.orgId, orgName, useThinking, emit);
        emit(sseEvent({ type: "done" }));
      } catch (err) {
        console.error("[ai/chat]", err);
        emit(sseEvent({ type: "error", message: String(err) }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
