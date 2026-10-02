import { json } from "@/lib/api";
import { supabaseServer } from "@/lib/supabase-server";
import { CATEGORIES, STATUSES } from "@/lib/site";

// GET /api/search?q=&category=&status=&from=&to= — public proofs only.
export async function GET(req: Request) {
  const sb = await supabaseServer();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const category = url.searchParams.get("category") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  let query = sb
    .from("pf_proofs")
    .select("id, proof_id, title, claim, category, status, coverage, views_count, completion_date, created_at, owner_id")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(60);

  if (q) {
    const esc = q.replace(/[%_]/g, "");
    query = query.or(`title.ilike.%${esc}%,claim.ilike.%${esc}%,proof_id.ilike.%${esc}%`);
  }
  if (category && (CATEGORIES as readonly string[]).includes(category)) query = query.eq("category", category);
  if (status && (STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to + "T23:59:59");

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);

  // Attach owner usernames (batch).
  const ownerIds = [...new Set((data ?? []).map((p) => p.owner_id))];
  let owners: Record<string, { username: string | null; name: string | null }> = {};
  if (ownerIds.length) {
    const { data: profs } = await sb.from("pf_profiles").select("id, username, name").in("id", ownerIds);
    owners = Object.fromEntries((profs ?? []).map((p) => [p.id, { username: p.username, name: p.name }]));
  }
  // Username search: if q matches a username, include their proofs too.
  let usernameHits: typeof data = [];
  if (q) {
    const { data: uprofs } = await sb.from("pf_profiles").select("id").ilike("username", `%${q.replace(/[%_]/g, "")}%`).limit(10);
    const uids = (uprofs ?? []).map((p) => p.id).filter((id) => !ownerIds.includes(id));
    if (uids.length) {
      const { data: up } = await sb
        .from("pf_proofs")
        .select("id, proof_id, title, claim, category, status, coverage, views_count, completion_date, created_at, owner_id")
        .eq("visibility", "public")
        .in("owner_id", uids)
        .order("created_at", { ascending: false })
        .limit(20);
      usernameHits = up ?? [];
      const { data: up2 } = await sb.from("pf_profiles").select("id, username, name").in("id", uids);
      for (const p of up2 ?? []) owners[p.id] = { username: p.username, name: p.name };
    }
  }
  const seen = new Set<string>();
  const proofs = [...(data ?? []), ...usernameHits]
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map((p) => ({ ...p, owner: owners[p.owner_id] ?? null, owner_id: undefined }));
  return json({ proofs });
}
