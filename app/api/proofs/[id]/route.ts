import { requireUser, ownedProof, logEvent, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";
import { CATEGORIES } from "@/lib/site";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/proofs/[id] — full owner detail incl. evidence, checks, events
export async function GET(_req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const proof = await ownedProof(id, user!.id);
  if (!proof) return bad("Proof not found", 404);
  const admin = supabaseAdmin();
  const [{ data: evidence }, { data: checks }, { data: events }, { data: vreqs }, { data: disputes }] = await Promise.all([
    admin.from("pf_evidence").select("*").eq("proof_id", id).order("created_at", { ascending: true }),
    admin.from("pf_verification_checks").select("*").eq("proof_id", id).order("checked_at", { ascending: false }).limit(40),
    admin.from("pf_proof_events").select("*").eq("proof_id", id).order("created_at", { ascending: false }).limit(30),
    admin.from("pf_verification_requests").select("*").eq("proof_id", id).order("created_at", { ascending: false }),
    admin.from("pf_disputes").select("*").eq("proof_id", id).order("created_at", { ascending: false }),
  ]);
  // Attach verifier display names.
  const verifierIds = [...new Set((vreqs ?? []).map((r) => r.verifier_id).filter(Boolean))];
  let verifierMap: Record<string, { username: string | null; name: string | null }> = {};
  if (verifierIds.length) {
    const { data: vprofs } = await admin.from("pf_profiles").select("id, username, name").in("id", verifierIds);
    verifierMap = Object.fromEntries((vprofs ?? []).map((p) => [p.id, { username: p.username, name: p.name }]));
  }
  const requests = (vreqs ?? []).map((r) => ({ ...r, verifier: r.verifier_id ? verifierMap[r.verifier_id] ?? null : null }));
  return json({ proof, evidence, checks, events, verification_requests: requests, disputes });
}

// PATCH /api/proofs/[id] — owner edits (blocked once REVOKED)
export async function PATCH(req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const proof = await ownedProof(id, user!.id);
  if (!proof) return bad("Proof not found", 404);
  if (proof.status === "REVOKED") return bad("Revoked proofs are frozen and cannot be edited");
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim().slice(0, 160);
  if (typeof body.claim === "string" && body.claim.trim()) patch.claim = body.claim.trim().slice(0, 2000);
  if (typeof body.description === "string") patch.description = body.description.slice(0, 5000) || null;
  if (typeof body.category === "string" && CATEGORIES.includes(body.category)) patch.category = body.category;
  if (typeof body.contribution === "string") patch.contribution = body.contribution.slice(0, 2000) || null;
  if (body.start_date !== undefined) patch.start_date = body.start_date || null;
  if (body.completion_date !== undefined) patch.completion_date = body.completion_date || null;
  if (typeof body.visibility === "string" && ["public", "unlisted", "private"].includes(body.visibility)) {
    patch.visibility = body.visibility;
  }
  const admin = supabaseAdmin();
  const { error: uErr } = await admin.from("pf_proofs").update(patch).eq("id", id);
  if (uErr) return bad(uErr.message, 500);
  await logEvent(id, "updated", user!.id, { fields: Object.keys(patch).filter((k) => k !== "updated_at") });
  return json({ ok: true });
}

// DELETE /api/proofs/[id] — owner deletes draft/unverified proofs
export async function DELETE(_req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const proof = await ownedProof(id, user!.id);
  if (!proof) return bad("Proof not found", 404);
  if (proof.status === "VERIFIED") return bad("Verified proofs cannot be deleted — revoke them instead to preserve the record");
  const admin = supabaseAdmin();
  // Remove uploaded files first.
  const { data: ev } = await admin.from("pf_evidence").select("source, type").eq("proof_id", id);
  const paths = (ev ?? []).filter((e) => ["image", "pdf", "video", "certificate", "file"].includes(e.type)).map((e) => e.source);
  if (paths.length) await admin.storage.from("pf-evidence").remove(paths);
  const { error: dErr } = await admin.from("pf_proofs").delete().eq("id", id);
  if (dErr) return bad(dErr.message, 500);
  return json({ ok: true });
}
