import { requireUser, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";

type Ctx = { params: Promise<{ id: string }> };

async function ownedCollection(id: string, userId: string) {
  const admin = supabaseAdmin();
  const { data } = await admin.from("pf_collections").select("*").eq("id", id).eq("owner_id", userId).maybeSingle();
  return data;
}

// GET /api/collections/[id] — detail + proofs (owner only; public view via profile page data)
export async function GET(_req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const col = await ownedCollection(id, user!.id);
  if (!col) return bad("Collection not found", 404);
  const admin = supabaseAdmin();
  const { data: links } = await admin.from("pf_collection_proofs").select("proof_id, added_at").eq("collection_id", id);
  const proofIds = (links ?? []).map((l) => l.proof_id);
  let proofs: unknown[] = [];
  if (proofIds.length) {
    const { data } = await admin
      .from("pf_proofs")
      .select("id, proof_id, title, claim, category, status, visibility, coverage, views_count, created_at")
      .in("id", proofIds);
    proofs = data ?? [];
  }
  return json({ collection: col, proofs });
}

// PATCH — edit title/description/visibility, or manage proofs: {action:'add'|'remove', proof_uuid}
export async function PATCH(req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const col = await ownedCollection(id, user!.id);
  if (!col) return bad("Collection not found", 404);
  const body = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();

  if (body.action === "add" || body.action === "remove") {
    const proofUuid = String(body.proof_uuid ?? "");
    const { data: proof } = await admin.from("pf_proofs").select("id, owner_id").eq("id", proofUuid).maybeSingle();
    if (!proof || proof.owner_id !== user!.id) return bad("Proof not found", 404);
    if (body.action === "add") {
      const { error: aErr } = await admin.from("pf_collection_proofs").upsert({ collection_id: id, proof_id: proofUuid }, { onConflict: "collection_id,proof_id" });
      if (aErr) return bad(aErr.message, 500);
    } else {
      await admin.from("pf_collection_proofs").delete().eq("collection_id", id).eq("proof_id", proofUuid);
    }
    return json({ ok: true });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim().slice(0, 120);
  if (typeof body.description === "string") patch.description = body.description.slice(0, 1000) || null;
  if (body.visibility === "public" || body.visibility === "private") patch.visibility = body.visibility;
  const { error: uErr } = await admin.from("pf_collections").update(patch).eq("id", id);
  if (uErr) return bad(uErr.message, 500);
  return json({ ok: true });
}

// DELETE /api/collections/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const col = await ownedCollection(id, user!.id);
  if (!col) return bad("Collection not found", 404);
  const admin = supabaseAdmin();
  const { error: dErr } = await admin.from("pf_collections").delete().eq("id", id);
  if (dErr) return bad(dErr.message, 500);
  return json({ ok: true });
}
