import { requireUser, logEvent, notify, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/verification-requests/[id] — the assigned verifier resolves it.
export async function PATCH(req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; comment?: string };
  if (!["verify", "reject", "request_changes"].includes(body.action ?? "")) {
    return bad("action must be verify | reject | request_changes");
  }

  const admin = supabaseAdmin();
  const { data: vreq } = await admin.from("pf_verification_requests").select("*").eq("id", id).maybeSingle();
  if (!vreq) return bad("Request not found", 404);
  if (vreq.verifier_id !== user!.id) return bad("Only the assigned verifier can resolve this request", 403);
  if (vreq.status !== "pending") return bad("This request has already been resolved", 400);

  const comment = String(body.comment ?? "").slice(0, 2000) || null;
  const { error: rErr } = await admin.from("pf_verification_reviews").insert({
    request_id: id,
    verifier_id: user!.id,
    action: body.action,
    comment,
  });
  if (rErr) return bad(rErr.message, 500);

  const newStatus = body.action === "verify" ? "verified" : body.action === "reject" ? "rejected" : "changes_requested";
  await admin.from("pf_verification_requests").update({ status: newStatus, resolved_at: new Date().toISOString() }).eq("id", id);
  await logEvent(vreq.proof_id, `human_${body.action}`, user!.id, { request_id: id, comment });

  const { data: proof } = await admin.from("pf_proofs").select("id, proof_id, title, status, owner_id").eq("id", vreq.proof_id).maybeSingle();
  if (proof) {
    if (body.action === "verify" && proof.status !== "REVOKED" && proof.status !== "DISPUTED") {
      // Human confirmation is the strongest signal — it verifies the proof.
      await admin.from("pf_proofs").update({ status: "VERIFIED", updated_at: new Date().toISOString() }).eq("id", proof.id);
      await logEvent(proof.id, "human_verified", user!.id, { request_id: id });
    }
    const titles: Record<string, string> = {
      verify: "Your proof was human-verified",
      reject: "Verification rejected",
      request_changes: "Verifier requested changes",
    };
    await notify(
      proof.owner_id,
      "verification_review",
      titles[body.action!],
      `A verifier ${body.action === "verify" ? "confirmed" : body.action === "reject" ? "rejected" : "requested changes on"} "${proof.title}" (${proof.proof_id}).${comment ? ` Comment: "${comment}"` : ""}`,
      `/proofs/${proof.id}`
    );
  }
  return json({ ok: true, status: newStatus });
}
