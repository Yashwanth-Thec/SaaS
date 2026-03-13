const BASE_URL = "https://openrouter.ai/api/v1";

export function hasOpenRouterKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function chatWithOpenRouter(opts: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const key   = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? "arcee-ai/trinity-large-preview:free";

  if (!key) throw new Error("OPENROUTER_API_KEY not configured");

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type":  "application/json",
      "HTTP-Referer":  "https://saas-scrub.com",
      "X-Title":       "SaaS-Scrub",
    },
    body: JSON.stringify({
      model,
      messages:   opts.messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens:  opts.maxTokens   ?? 1500,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
