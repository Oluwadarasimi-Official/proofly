import { requireUser, ownedProof, logEvent, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";

const EVIDENCE_TYPES = ["url", "github_repo", "github_commit", "live_site", "image", "pdf", "video", "certificate", "file"] as const;
const UPLOAD_TYPES = new Set(["image", "pdf", "video", "certificate", "file"]);
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED_MIME: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  pdf: ["application/pdf"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  certificate: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  file: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "video/mp4", "video/webm", "text/plain"],
};

// POST /api/evidence — attach evidence. Accepts JSON {proof_uuid,type,source,description,visibility}
// or multipart FormData {proof_uuid,type,description,visibility,file}.
export async function POST(req: Request) {
  const { error, user } = await requireUser();
  if (error) return error;
  const admin = supabaseAdmin();

  let proofUuid = "", type = "", source = "", description = "", visibility = "public";
  let upload: File | null = null;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    proofUuid = String(form.get("proof_uuid") ?? "");
    type = String(form.get("type") ?? "");
    description = String(form.get("description") ?? "");
    visibility = String(form.get("visibility") ?? "public");
    const f = form.get("file");
    if (f instanceof File && f.size > 0) upload = f;
  } else {
    const body = await req.json().catch(() => ({}));
    proofUuid = String(body.proof_uuid ?? "");
    type = String(body.type ?? "");
    source = String(body.source ?? "").trim();
    description = String(body.description ?? "");
    visibility = String(body.visibility ?? "public");
  }

  if (!EVIDENCE_TYPES.includes(type as (typeof EVIDENCE_TYPES)[number])) return bad("Invalid evidence type");
  if (!["public", "private"].includes(visibility)) return bad("Invalid visibility");
  const proof = await ownedProof(proofUuid, user!.id);
  if (!proof) return bad("Proof not found", 404);
  if (proof.status === "REVOKED") return bad("Revoked proofs are frozen");

  let fileName: string | null = null;
  let mime: string | null = null;
  let sizeBytes: number | null = null;

  if (UPLOAD_TYPES.has(type)) {
    if (!upload) return bad("A file upload is required for this evidence type");
    if (upload.size > MAX_BYTES) return bad(`File too large — maximum ${MAX_BYTES / 1024 / 1024} MB`);
    mime = upload.type || "application/octet-stream";
    const allowed = ALLOWED_MIME[type] ?? [];
    if (!allowed.includes(mime)) return bad(`File type ${mime} is not allowed for ${type} evidence`);
    const safeName = upload.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
    const path = `${user!.id}/${proofUuid}/${Date.now()}-${safeName}`;
    const { error: upErr } = await admin.storage.from("pf-evidence").upload(path, upload, { contentType: mime, upsert: false });
    if (upErr) return bad(`Upload failed: ${upErr.message}`, 500);
    source = path;
    fileName = upload.name.slice(0, 200);
    sizeBytes = upload.size;
  } else {
    if (!source) return bad("A source URL is required");
    if (!/^https?:\/\//i.test(source)) return bad("Source must be an http(s) URL");
    if (source.length > 2000) return bad("Source URL too long");
  }

  const { data, error: iErr } = await admin
    .from("pf_evidence")
    .insert({
      proof_id: proofUuid,
      type,
      source,
      description: description.trim().slice(0, 1000) || null,
      file_name: fileName,
      mime,
      size_bytes: sizeBytes,
      visibility,
    })
    .select("id")
    .single();
  if (iErr) return bad(iErr.message, 500);
  await logEvent(proofUuid, "evidence_added", user!.id, { evidence_id: data.id, type });
  return json({ id: data.id }, 201);
}
