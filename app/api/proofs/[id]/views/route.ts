import { createHash } from "crypto";
import { json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";
import { supabaseServer } from "@/lib/supabase-server";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/proofs/[id]/views — record a real view, deduped by (proof, hashed IP, day).
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data: proof } = await admin.from("pf_proofs").select("id, visibility").eq("id", id).maybeSingle();
  if (!proof || proof.visibility === "private") return bad("Not found", 404);

  const fwd = _req.headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : _req.headers.get("x-real-ip") ?? "unknown").trim();
  const ipHash = createHash("sha256").update(ip + "|proofly-view").digest("hex").slice(0, 32);
  const today = new Date().toISOString().slice(0, 10);

  // Upsert the per-day view row; only bump the counter on first view of the day.
  const { data: existing } = await admin
    .from("pf_proof_views")
    .select("id, count")
    .eq("proof_id", id)
    .eq("ip_hash", ipHash)
    .eq("viewed_on", today)
    .maybeSingle();
  if (existing) {
    await admin.from("pf_proof_views").update({ count: existing.count + 1 }).eq("id", existing.id);
  } else {
    await admin.from("pf_proof_views").insert({ proof_id: id, ip_hash: ipHash, viewed_on: today, count: 1 });
    await admin.rpc("pf_bump_views", { p_proof_id: id });
  }
  return json({ ok: true });
}
