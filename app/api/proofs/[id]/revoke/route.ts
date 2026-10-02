import { requireUser, ownedProof, logEvent, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/proofs/[id]/revoke — owner revokes; the record is preserved.
export async function POST(req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const proof = await ownedProof(id, user!.id);
  if (!proof) return bad("Proof not found", 404);
  if (proof.status === "REVOKED") return bad("Already revoked", 400);
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };

  const admin = supabaseAdmin();
  const now = new Date().toISOString();
  const { error: uErr } = await admin
    .from("pf_proofs")
    .update({ status: "REVOKED", revoked_at: now, updated_at: now })
    .eq("id", id);
  if (uErr) return bad(uErr.message, 500);
  await logEvent(id, "revoked", user!.id, { reason: (reason ?? "").slice(0, 500) || null, previous_status: proof.status });
  return json({ ok: true });
}
