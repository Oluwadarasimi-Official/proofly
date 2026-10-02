import { json, bad } from "@/lib/api";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase-server";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/evidence/[id]/file — serve an uploaded file through a signed URL.
// Access rules are enforced server-side: private evidence is visible only to
// the proof owner; public evidence only when the proof itself is not private.
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const admin = supabaseAdmin();
  const { data: ev } = await admin.from("pf_evidence").select("id, proof_id, type, source, visibility, mime, file_name").eq("id", id).maybeSingle();
  if (!ev) return bad("Not found", 404);
  if (!["image", "pdf", "video", "certificate", "file"].includes(ev.type)) return bad("Not a file", 400);

  const { data: proof } = await admin.from("pf_proofs").select("id, owner_id, visibility").eq("id", ev.proof_id).maybeSingle();
  if (!proof) return bad("Not found", 404);

  const sb = await supabaseServer();
  const viewer = (await sb.auth.getUser()).data.user;
  const isOwner = viewer?.id === proof.owner_id;
  if (proof.visibility === "private" && !isOwner) return bad("Not found", 404);
  if (ev.visibility === "private" && !isOwner) return bad("Not found", 404);

  const { data: signed, error } = await admin.storage.from("pf-evidence").createSignedUrl(ev.source, 3600);
  if (error || !signed) return bad("File unavailable", 500);
  return json({ url: signed.signedUrl, mime: ev.mime, file_name: ev.file_name });
}
