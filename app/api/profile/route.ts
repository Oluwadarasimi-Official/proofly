import { requireUser, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";

// GET /api/profile — my profile
export async function GET() {
  const { error, user } = await requireUser();
  if (error) return error;
  const admin = supabaseAdmin();
  const { data } = await admin.from("pf_profiles").select("*").eq("id", user!.id).maybeSingle();
  return json({ profile: data, email: user!.email });
}

// PATCH /api/profile — update my profile
export async function PATCH(req: Request) {
  const { error, user } = await requireUser();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();

  if (typeof body.username === "string") {
    const clean = body.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length < 3) return bad("Username must be at least 3 characters");
    const { data: taken } = await admin.from("pf_profiles").select("id").eq("username", clean).neq("id", user!.id).maybeSingle();
    if (taken) return bad("That username is taken");
    body.username = clean;
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["username", "name", "bio", "organization", "website", "avatar_url"]) {
    if (typeof body[k] === "string") patch[k] = body[k].slice(0, k === "bio" ? 500 : 200) || null;
  }
  if (body.social_links && typeof body.social_links === "object") {
    const sl: Record<string, string> = {};
    for (const k of ["x", "linkedin", "github", "instagram"]) {
      if (typeof body.social_links[k] === "string" && body.social_links[k].trim()) sl[k] = body.social_links[k].trim().slice(0, 200);
    }
    patch.social_links = sl;
  }
  const { error: uErr } = await admin.from("pf_profiles").update(patch).eq("id", user!.id);
  if (uErr) return bad(uErr.message, 500);
  return json({ ok: true });
}
