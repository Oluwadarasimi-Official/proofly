import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin, currentUser } from "./supabase-server";

export async function requireUser() {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) as NextResponse, user: null };
  return { error: null as null, user };
}

/** Fetch a proof by internal id ensuring the caller owns it. */
export async function ownedProof(proofUuid: string, userId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("pf_proofs")
    .select("*")
    .eq("id", proofUuid)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function logEvent(proofId: string, eventType: string, actorId: string | null, detail: Record<string, unknown> = {}) {
  const admin = supabaseAdmin();
  await admin.from("pf_proof_events").insert({ proof_id: proofId, event_type: eventType, actor_id: actorId, detail });
}

export async function notify(userId: string, type: string, title: string, body: string | null, link: string | null) {
  const admin = supabaseAdmin();
  await admin.from("pf_notifications").insert({ user_id: userId, type, title, body, link });
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** The server-component Supabase client for the current request (RLS-enforced). */
export { supabaseServer };
