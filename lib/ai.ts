// AI assist — strictly advisory. The AI never declares work genuine.
// Entirely env-gated: when AI_API_KEY is unset, /api/ai/status reports
// disabled and the UI hides every AI control.

export function aiEnabled(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

interface AiOpts {
  system: string;
  user: string;
  maxTokens?: number;
}

export async function aiComplete({ system, user, maxTokens = 600 }: AiOpts): Promise<string> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("AI is not configured");
  const url = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI provider returned HTTP ${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = j.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI provider returned an empty response");
  return text;
}

export const AI_DISCLAIMER =
  "AI suggestion only — it does not verify that the work is genuine. Only technical checks and human verifiers do that.";
