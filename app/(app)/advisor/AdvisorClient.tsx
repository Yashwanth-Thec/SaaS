"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm     from "remark-gfm";
import {
  Brain, Send, Sparkles, Zap, ChevronDown, ChevronUp,
  Wrench, CheckCircle2, Loader2, Key, RotateCcw,
  MessageSquare, TrendingDown, AlertTriangle, FileText,
  Users, BarChart3, DollarSign, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn }     from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface ThinkingSegment { type: "thinking"; content: string }
interface TextSegment     { type: "text";     content: string }
interface ToolSegment     { type: "tool";     name: string; status: "running" | "done"; summary?: string }
type Segment = ThinkingSegment | TextSegment | ToolSegment;

interface Message {
  id:       string;
  role:     Role;
  segments: Segment[];
  loading?: boolean;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: TrendingDown, label: "Where is our biggest SaaS waste?",          prompt: "Analyze our SaaS stack and identify the top 3 areas of waste. Quantify the dollar amount for each." },
  { icon: AlertTriangle, label: "What alerts need immediate action?",        prompt: "Show me the most critical alerts right now and recommend specific actions I should take today." },
  { icon: FileText,      label: "Which contracts are at risk?",              prompt: "Review our upcoming contract renewals. Flag any that are in the notice window or auto-renewing without review." },
  { icon: Users,         label: "Audit underutilized tools",                 prompt: "Find all apps where we're paying for seats that aren't being used. Sort by wasted dollars per month." },
  { icon: BarChart3,     label: "Break down spend by category",              prompt: "Give me a full breakdown of our SaaS spend by category. Which categories are overweight for a company our size?" },
  { icon: DollarSign,    label: "Build a 30-day savings plan",               prompt: "Using all available data, build a prioritized 30-day action plan to reduce our SaaS spend. Include specific app names and dollar savings." },
  { icon: Lightbulb,     label: "Detect shadow IT risks",                    prompt: "Are there any apps in our stack that look like unapproved shadow IT? What's the security risk?" },
  { icon: Zap,           label: "Create alert for zombie apps",              prompt: "Find any zombie apps (low usage, still billed) and create an alert for each one." },
];

// ─── Tool name display ────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  get_saas_overview:      "Loading SaaS overview",
  get_apps:               "Querying app catalog",
  get_underutilized_apps: "Scanning for underutilization",
  get_spend_by_category:  "Analyzing spend breakdown",
  get_contracts_expiring: "Checking contract renewals",
  get_active_alerts:      "Fetching active alerts",
  get_offboarding_status: "Checking offboardings",
  create_alert:           "Creating alert",
};

// ─── Thinking panel ───────────────────────────────────────────────────────────

function ThinkingPanel({ content, active }: { content: string; active: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => { if (active) setOpen(true); }, [active]);

  return (
    <div className="mt-2 rounded-lg border border-accent/20 bg-accent/5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent hover:bg-accent/10 transition-colors"
      >
        <Brain className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-semibold">
          {active ? "Claude is thinking…" : "View reasoning"}
        </span>
        {active
          ? <Loader2 className="w-3 h-3 ml-auto animate-spin" />
          : open
            ? <ChevronUp   className="w-3.5 h-3.5 ml-auto" />
            : <ChevronDown className="w-3.5 h-3.5 ml-auto" />
        }
      </button>
      {open && content && (
        <div className="px-3 pb-3">
          <p className="text-xs text-accent/70 font-mono leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tool badge ───────────────────────────────────────────────────────────────

function ToolBadge({ segment }: { segment: ToolSegment }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border my-0.5",
      segment.status === "running"
        ? "bg-info/8 border-info/20 text-info/80"
        : "bg-accent/8 border-accent/20 text-accent/80",
    )}>
      {segment.status === "running"
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <CheckCircle2 className="w-3 h-3" />
      }
      <Wrench className="w-3 h-3" />
      <span>{TOOL_LABELS[segment.name] ?? segment.name}</span>
      {segment.summary && <span className="opacity-60">— {segment.summary}</span>}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  const textSegments    = msg.segments.filter((s): s is TextSegment     => s.type === "text");
  const thinkingSegment = msg.segments.find((s): s is ThinkingSegment  => s.type === "thinking");
  const toolSegments    = msg.segments.filter((s): s is ToolSegment    => s.type === "tool");
  const isThinking      = msg.loading && !textSegments.some((s) => s.content);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-accent text-base text-sm leading-relaxed">
          {(msg.segments[0] as TextSegment)?.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Thinking panel */}
        {thinkingSegment && (
          <ThinkingPanel content={thinkingSegment.content} active={isThinking ?? false} />
        )}

        {/* Tool badges */}
        {toolSegments.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {toolSegments.map((seg, i) => <ToolBadge key={i} segment={seg} />)}
          </div>
        )}

        {/* Text content */}
        {textSegments.map((seg, i) => (
          seg.content && (
            <div key={i} className="prose-advisor">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="font-display font-bold text-base text-primary mt-4 mb-2 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="font-display font-bold text-sm text-primary mt-4 mb-2 first:mt-0 flex items-center gap-1.5">{children}</h2>,
                  h3: ({ children }) => <h3 className="font-semibold text-sm text-primary mt-3 mb-1.5">{children}</h3>,
                  p:  ({ children }) => <p className="text-sm text-secondary leading-relaxed mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="space-y-1 mb-2 ml-3">{children}</ul>,
                  ol: ({ children }) => <ol className="space-y-1 mb-2 ml-3 list-decimal list-outside">{children}</ol>,
                  li: ({ children }) => (
                    <li className="text-sm text-secondary leading-relaxed flex items-start gap-1.5">
                      <span className="text-accent mt-1.5 flex-shrink-0">•</span>
                      <span>{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
                  em:     ({ children }) => <em className="text-secondary italic">{children}</em>,
                  code:   ({ children }) => <code className="font-mono text-xs bg-elevated border border-border px-1.5 py-0.5 rounded text-accent">{children}</code>,
                  hr:     () => <hr className="border-border my-3" />,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-accent/40 pl-3 my-2 text-sm text-muted italic">{children}</blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-border bg-surface">
                      <table className="w-full text-xs border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-elevated border-b border-border">{children}</thead>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  th: ({ children }) => (
                    <th className="px-3 py-2.5 text-left font-semibold text-muted uppercase tracking-wider whitespace-nowrap" style={{ fontSize: "11px" }}>
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2.5 text-secondary border-t border-border/60 align-middle">
                      {children}
                    </td>
                  ),
                  tr: ({ children }) => <tr className="hover:bg-elevated/40 transition-colors">{children}</tr>,
                  a:  ({ href, children }) => <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                }}
              >
                {seg.content}
              </ReactMarkdown>
            </div>
          )
        ))}

        {/* Typing indicator */}
        {msg.loading && isThinking && (
          <div className="flex gap-1 py-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function AdvisorClient({
  orgName,
  userName,
  apiKeySet,
}: {
  orgName:   string;
  userName:  string;
  apiKeySet: boolean;
}) {
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [useThinking,  setUseThinking]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = {
      id:       crypto.randomUUID(),
      role:     "user",
      segments: [{ type: "text", content: text }],
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id:       assistantId,
      role:     "assistant",
      segments: [],
      loading:  true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    // Build messages array for API (only text content from prior turns)
    const apiMessages = [...messages, userMsg].map((m) => ({
      role:    m.role,
      content: m.segments.filter((s) => s.type === "text").map((s) => (s as TextSegment).content).join(""),
    })).filter((m) => m.content);

    try {
      const res = await fetch("/api/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: apiMessages, useThinking }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string; delta?: string; name?: string; summary?: string;
            };

            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === assistantId);
              if (idx === -1) return prev;
              const msg = { ...prev[idx], segments: [...prev[idx].segments] };

              if (event.type === "thinking_start") {
                msg.segments.push({ type: "thinking", content: "" });
              } else if (event.type === "thinking_delta") {
                const t = msg.segments.findLast((s) => s.type === "thinking") as ThinkingSegment | undefined;
                if (t) {
                  msg.segments = msg.segments.map((s) => s === t ? { ...t, content: t.content + (event.delta ?? "") } : s);
                }
              } else if (event.type === "tool_start") {
                msg.segments.push({ type: "tool", name: event.name ?? "", status: "running" });
              } else if (event.type === "tool_done") {
                msg.segments = msg.segments.map((s) =>
                  s.type === "tool" && (s as ToolSegment).name === event.name && (s as ToolSegment).status === "running"
                    ? { ...s, status: "done", summary: event.summary }
                    : s
                );
              } else if (event.type === "text_delta") {
                const last = msg.segments[msg.segments.length - 1];
                if (last?.type === "text") {
                  msg.segments = [...msg.segments.slice(0, -1), { ...last, content: last.content + (event.delta ?? "") }];
                } else {
                  msg.segments.push({ type: "text", content: event.delta ?? "" });
                }
              } else if (event.type === "done" || event.type === "error") {
                msg.loading = false;
                if (event.type === "error") {
                  msg.segments.push({ type: "text", content: "Sorry, something went wrong. Please try again." });
                }
              }

              const next = [...prev];
              next[idx] = msg;
              return next;
            });
          } catch {}
        }
      }
    } catch (err) {
      console.error("[advisor]", err);
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === assistantId);
        if (idx === -1) return prev;
        const msg = { ...prev[idx], loading: false };
        msg.segments = [...msg.segments, { type: "text", content: "Connection error. Check that ANTHROPIC_API_KEY is set." }];
        const next = [...prev];
        next[idx] = msg;
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [messages, loading, useThinking]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center">
            <Brain className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="font-display font-bold text-sm text-primary">SaaS Advisor</div>
            <div className="text-xs text-muted">Claude {MODELS_LABEL} · live data</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Extended thinking toggle */}
          <button
            onClick={() => setUseThinking((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
              useThinking
                ? "bg-accent/15 border-accent/30 text-accent"
                : "bg-elevated border-border text-muted hover:text-secondary"
            )}
          >
            <Brain className="w-3.5 h-3.5" />
            {useThinking ? "Thinking ON" : "Enable Thinking"}
          </button>

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-border text-muted hover:text-danger hover:border-danger/30 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* API key warning */}
      {!apiKeySet && (
        <div className="mx-6 mt-4 flex items-start gap-3 p-3 rounded-lg bg-warning/8 border border-warning/20">
          <Key className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-secondary">
            <span className="font-semibold text-warning">ANTHROPIC_API_KEY not set.</span> Add it to <code className="font-mono text-warning">.env.local</code> to enable the Advisor.
          </p>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            {/* Welcome */}
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-accent" />
              </div>
              <h2 className="font-display font-bold text-xl text-primary mb-2">
                Hi {userName.split(" ")[0]}, I&apos;m your SaaS Advisor
              </h2>
              <p className="text-sm text-secondary max-w-md mx-auto leading-relaxed">
                I have live access to {orgName}&apos;s SaaS data — apps, spend, contracts, alerts, and more.
                Ask me anything or pick a suggestion below.
              </p>
              {useThinking && (
                <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs text-accent">
                  <Brain className="w-3.5 h-3.5" />
                  Extended thinking enabled — deeper analysis, visible reasoning
                </div>
              )}
            </div>

            {/* Suggestions grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  disabled={!apiKeySet || loading}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-surface hover:bg-elevated hover:border-accent/30 transition-all text-left group disabled:opacity-40"
                >
                  <div className="w-7 h-7 rounded-lg bg-elevated border border-border flex items-center justify-center flex-shrink-0 group-hover:border-accent/30 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
                  </div>
                  <span className="text-xs text-secondary group-hover:text-primary transition-colors leading-relaxed">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={apiKeySet ? "Ask anything about your SaaS stack… (Enter to send)" : "Set ANTHROPIC_API_KEY to start"}
              disabled={!apiKeySet || loading}
              rows={1}
              className="w-full resize-none bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-40"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || !apiKeySet || loading}
            className="self-end"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="max-w-3xl mx-auto text-center text-xs text-muted mt-2">
          <MessageSquare className="w-3 h-3 inline mr-1" />
          Claude has real-time access to your SaaS data via tool calls · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

const MODELS_LABEL = "Opus 4.6";
