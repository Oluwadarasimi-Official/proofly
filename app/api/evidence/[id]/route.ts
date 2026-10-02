import { requireUser, logEvent, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/evidence/[id] — owner removes an evidence item (and its file).
export async function DELETE(_req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data: ev } = await admin.from("pf_evidence").select("*").eq("id", id).maybeSingle();
  if (!ev) return bad("Evidence not found", 404);
  const { data: proof } = await admin.from("pf_proofs").select("id, owner_id, status").eq("id", ev.proof_id).maybeSingle();
  if (!proof || proof.owner_id !== user!.id) return bad("Evidence not found", 404);
  if (proof.status === "REVOKED") return bad("Revoked proofs are frozen");

  if (["image", "pdf", "video", "certificate", "file"].includes(ev.type)) {
    await admin.storage.from("pf-evidence").remove([ev.source]);
  }
  const { error: dErr } = await admin.from("pf_evidence").delete().eq("id", id);
  if (dErr) return bad(dErr.message, 500);
  await logEvent(proof.id, "evidence_removed", user!.id, { evidence_id: id, type: ev.type });
  return json({ ok: true });
}
