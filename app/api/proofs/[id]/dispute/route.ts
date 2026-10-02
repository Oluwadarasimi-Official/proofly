import { requireUser, logEvent, notify, json, bad } from "@/lib/api";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase-server";
import { DISPUTE_REASONS } from "@/lib/site";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/proofs/[id]/dispute — anyone (even signed-out) can file a dispute.
// A disputed proof becomes DISPUTED; it is never silently hidden.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data: proof } = await admin
    .from("pf_proofs")
    .select("id, proof_id, title, owner_id, status, visibility")
    .eq("id", id)
    .maybeSingle();
  if (!proof) return bad("Proof not found", 404);
  if (proof.visibility === "private") return bad("This proof is private", 403);
  if (proof.status === "REVOKED") return bad("Revoked proofs cannot be disputed", 400);

  const body = (await req.json().catch(() => ({}))) as { reason?: string; detail?: string };
  const validReasons = DISPUTE_REASONS.map((r) => r.value);
  if (!body.reason || !validReasons.includes(body.reason)) return bad("A valid dispute reason is required");
  const detail = String(body.detail ?? "").slice(0, 2000) || null;

  // Signed-in reporter is recorded; anonymous reports are allowed too.
  const sb = await supabaseServer();
  const reporter = (await sb.auth.getUser()).data.user;

  const { error: dErr } = await admin.from("pf_disputes").insert({
    proof_id: id,
    reporter_id: reporter?.id ?? null,
    reason: body.reason,
    detail,
    status: "open",
  });
  if (dErr) return bad(dErr.message, 500);

  if (proof.status !== "DISPUTED") {
    await admin.from("pf_proofs").update({ status: "DISPUTED", updated_at: new Date().toISOString() }).eq("id", id);
    await logEvent(id, "disputed", reporter?.id ?? null, { reason: body.reason, previous_status: proof.status });
  } else {
    await logEvent(id, "dispute_filed", reporter?.id ?? null, { reason: body.reason });
  }
  await notify(
    proof.owner_id,
    "dispute",
    "Your proof was disputed",
    `Someone reported "${proof.title}" (${proof.proof_id}). Review it from your dashboard.`,
    `/proofs/${id}`
  );
  return json({ ok: true }, 201);
}

// PATCH /api/proofs/[id]/dispute — owner resolves one of their disputes.
export async function PATCH(req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data: proof } = await admin.from("pf_proofs").select("id, owner_id, status").eq("id", id).maybeSingle();
  if (!proof || proof.owner_id !== user!.id) return bad("Proof not found", 404);
  const body = (await req.json().catch(() => ({}))) as { dispute_id?: string; action?: string };
  if (!body.dispute_id || !["dismissed", "resolved"].includes(body.action ?? "")) return bad("dispute_id and action (dismissed|resolved) required");

  const { data: dispute } = await admin.from("pf_disputes").select("*").eq("id", body.dispute_id).eq("proof_id", id).maybeSingle();
  if (!dispute) return bad("Dispute not found", 404);

  await admin.from("pf_disputes").update({ status: body.action }).eq("id", body.dispute_id);
  await logEvent(id, body.action === "dismissed" ? "dispute_dismissed" : "dispute_resolved", user!.id, { dispute_id: body.dispute_id });

  // If no open disputes remain and the proof is DISPUTED, restore it to DRAFT for re-verification.
  const { count } = await admin.from("pf_disputes").select("id", { count: "exact", head: true }).eq("proof_id", id).eq("status", "open");
  if ((count ?? 0) === 0 && proof.status === "DISPUTED") {
    await admin.from("pf_proofs").update({ status: "DRAFT", updated_at: new Date().toISOString() }).eq("id", id);
    await logEvent(id, "status_restored", user!.id, { restored_to: "DRAFT", note: "All disputes closed — re-run verification." });
  }
  return json({ ok: true });
}
