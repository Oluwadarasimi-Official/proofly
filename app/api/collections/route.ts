import { requireUser, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";

// GET /api/collections — my collections with proof counts
// POST /api/collections — create a collection
export async function GET() {
  const { error, user } = await requireUser();
  if (error) return error;
  const admin = supabaseAdmin();
  const { data, error: qErr } = await admin
    .from("pf_collections")
    .select("id, title, description, visibility, created_at, pf_collection_proofs(count)")
    .eq("owner_id", user!.id)
    .order("created_at", { ascending: false });
  if (qErr) return bad(qErr.message, 500);
  return json({ collections: (data ?? []).map((c) => ({ ...c, proof_count: c.pf_collection_proofs?.[0]?.count ?? 0 })) });
}

export async function POST(req: Request) {
  const { error, user } = await requireUser();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title) return bad("Title is required");
  const visibility = body.visibility === "private" ? "private" : "public";
  const admin = supabaseAdmin();
  const { data, error: iErr } = await admin
    .from("pf_collections")
    .insert({ owner_id: user!.id, title: title.slice(0, 120), description: String(body.description ?? "").slice(0, 1000) || null, visibility })
    .select("id")
    .single();
  if (iErr) return bad(iErr.message, 500);
  return json({ id: data.id }, 201);
}
