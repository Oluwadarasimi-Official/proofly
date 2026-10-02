import { requireUser, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";

// GET /api/notifications — my notifications, newest first
export async function GET() {
  const { error, user } = await requireUser();
  if (error) return error;
  const admin = supabaseAdmin();
  const { data, error: qErr } = await admin
    .from("pf_notifications")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (qErr) return bad(qErr.message, 500);
  return json({ notifications: data });
}

// PATCH /api/notifications — {action:'read', id} or {action:'read_all'}
export async function PATCH(req: Request) {
  const { error, user } = await requireUser();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();
  if (body.action === "read_all") {
    await admin.from("pf_notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    return json({ ok: true });
  }
  if (body.action === "read" && body.id) {
    await admin.from("pf_notifications").update({ read: true }).eq("id", body.id).eq("user_id", user!.id);
    return json({ ok: true });
  }
  return bad("Invalid action");
}
