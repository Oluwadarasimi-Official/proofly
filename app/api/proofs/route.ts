import { requireUser, ownedProof, logEvent, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";
import { randomProofId } from "@/lib/proofId";
import { CATEGORIES } from "@/lib/site";

// GET /api/proofs — my proofs (newest first)
export async function GET() {
  const { error, user } = await requireUser();
  if (error) return error;
  const admin = supabaseAdmin();
  const { data, error: qErr } = await admin
    .from("pf_proofs")
    .select("id, proof_id, title, claim, category, status, visibility, coverage, views_count, completion_date, created_at")
    .eq("owner_id", user!.id)
    .order("created_at", { ascending: false });
  if (qErr) return bad(qErr.message, 500);
  return json({ proofs: data });
}

// POST /api/proofs — create a draft proof. Proof ID is generated server-side.
export async function POST(req: Request) {
  const { error, user } = await requireUser();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const claim = String(body.claim ?? "").trim();
  if (!title) return bad("Title is required");
  if (!claim) return bad("An explicit claim is required");
  const category = CATEGORIES.includes(body.category) ? body.category : "Other";
  const visibility = ["public", "unlisted", "private"].includes(body.visibility) ? body.visibility : "private";

  const admin = supabaseAdmin();
  // Generate a unique proof ID (retry on the astronomically unlikely collision).
  let proofId = "";
  for (let i = 0; i < 5; i++) {
    const candidate = randomProofId();
    const { data: exists } = await admin.from("pf_proofs").select("id").eq("proof_id", candidate).maybeSingle();
    if (!exists) {
      proofId = candidate;
      break;
    }
  }
  if (!proofId) return bad("Could not mint a proof ID — please retry", 500);

  const { data, error: iErr } = await admin
    .from("pf_proofs")
    .insert({
      proof_id: proofId,
      owner_id: user!.id,
      title: title.slice(0, 160),
      claim: claim.slice(0, 2000),
      description: String(body.description ?? "").slice(0, 5000) || null,
      category,
      start_date: body.start_date || null,
      completion_date: body.completion_date || null,
      contribution: String(body.contribution ?? "").slice(0, 2000) || null,
      visibility,
      status: "DRAFT",
    })
    .select("id, proof_id")
    .single();
  if (iErr) return bad(iErr.message, 500);
  await logEvent(data.id, "created", user!.id, { proof_id: proofId, visibility });
  return json({ id: data.id, proof_id: proofId }, 201);
}
