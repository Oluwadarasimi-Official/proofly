import { requireUser, json, bad } from "@/lib/api";
import { aiEnabled, aiComplete, AI_DISCLAIMER } from "@/lib/ai";

// POST /api/ai/assist — advisory AI only. Never declares work genuine.
// Modes: summarize_claim | analyze_evidence | suggest_evidence | flag_inconsistencies
export async function POST(req: Request) {
  const { error, user } = await requireUser();
  if (error) return error;
  if (!aiEnabled()) return bad("AI assist is not configured", 404);
  void user;

  const body = (await req.json().catch(() => ({}))) as {
    mode?: string;
    claim?: string;
    description?: string;
    evidence?: { type: string; source: string; description: string | null }[];
    category?: string;
  };
  const modes = ["summarize_claim", "analyze_evidence", "suggest_evidence", "flag_inconsistencies"] as const;
  if (!body.mode || !(modes as readonly string[]).includes(body.mode)) return bad("Invalid mode");

  const evidenceText = (body.evidence ?? [])
    .map((e, i) => `${i + 1}. [${e.type}] ${e.source} — ${e.description ?? "no description"}`)
    .join("\n");

  const prompts: Record<string, { system: string; user: string }> = {
    summarize_claim: {
      system:
        "You help users write clear, explicit, falsifiable claims about work they completed. You never assert the claim is true.",
      user: `Rewrite this work claim to be more specific and falsifiable (one or two sentences). Keep the user's meaning.\n\nClaim: ${body.claim ?? ""}\nCategory: ${body.category ?? ""}\nDescription: ${(body.description ?? "").slice(0, 800)}`,
    },
    analyze_evidence: {
      system:
        "You analyze evidence descriptions for clarity and completeness. You never declare the underlying work genuine — only technical checks and human verifiers do that.",
      user: `Claim: ${body.claim ?? ""}\n\nEvidence:\n${evidenceText}\n\nRate how well each evidence item supports the claim (strong/weak/unrelated), in 4 sentences or fewer total.`,
    },
    suggest_evidence: {
      system: "You suggest what kinds of evidence would strengthen a proof-of-work record. Be concrete and brief.",
      user: `Someone claims: "${body.claim ?? ""}" (category: ${body.category ?? ""}).\nCurrent evidence:\n${evidenceText || "(none yet)"}\n\nSuggest 3 specific evidence items they could add. Bullet list, one line each.`,
    },
    flag_inconsistencies: {
      system:
        "You flag possible inconsistencies between a claim and its evidence descriptions. Phrase everything as a question or a possibility, never as a verdict.",
      user: `Claim: ${body.claim ?? ""}\nDescription: ${(body.description ?? "").slice(0, 800)}\n\nEvidence:\n${evidenceText || "(none yet)"}\n\nList any inconsistencies or gaps you notice, as possibilities to double-check. Bullet list, max 4 items.`,
    },
  };

  try {
    const text = await aiComplete(prompts[body.mode]);
    return json({ result: text, disclaimer: AI_DISCLAIMER });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "AI request failed", 502);
  }
}
