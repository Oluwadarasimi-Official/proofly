import { requireUser, ownedProof, logEvent, notify, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/proofs/[id]/request-verification — owner asks a specific user to verify.
export async function POST(req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const proof = await ownedProof(id, user!.id);
  if (!proof) return bad("Proof not found", 404);
  if (proof.status === "REVOKED") return bad("Revoked proofs cannot be verified");

  const body = (await req.json().catch(() => ({}))) as { username?: string; message?: string };
  const username = String(body.username ?? "").trim().toLowerCase().replace(/^@/, "");
  if (!username) return bad("A verifier username is required");

  const admin = supabaseAdmin();
  const { data: verifier } = await admin.from("pf_profiles").select("id, username, name").eq("username", username).maybeSingle();
  if (!verifier) return bad(`No Proofly user found with username @${username}`);
  if (verifier.id === user!.id) return bad("You cannot verify your own proof");

  const { data: existing } = await admin
    .from("pf_verification_requests")
    .select("id")
    .eq("proof_id", id)
    .eq("verifier_id", verifier.id)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) return bad("A pending request to this verifier already exists");

  const { data: created, error: cErr } = await admin
    .from("pf_verification_requests")
    .insert({
      proof_id: id,
      requester_id: user!.id,
      verifier_id: verifier.id,
      status: "pending",
      message: String(body.message ?? "").slice(0, 1000) || null,
    })
    .select("id")
    .single();
  if (cErr) return bad(cErr.message, 500);

  if (proof.status === "DRAFT") {
    await admin.from("pf_proofs").update({ status: "PENDING", updated_at: new Date().toISOString() }).eq("id", id);
  }
  await logEvent(id, "verification_requested", user!.id, { verifier: username, request_id: created.id });
  await notify(
    verifier.id,
    "verification_request",
    "Verification requested",
    `@${username === verifier.username ? username : verifier.username} — someone asked you to verify "${proof.title}" (${proof.proof_id}).`,
    "/verify"
  );
  return json({ ok: true }, 201);
}
