import { createHash } from "crypto";
import { requireUser, ownedProof, logEvent, json, bad } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase-server";
import { runAllChecks, coverageOf, type CheckResult } from "@/lib/verify";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/proofs/[id]/verify — run the real verification engine.
export async function POST(_req: Request, { params }: Ctx) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const proof = await ownedProof(id, user!.id);
  if (!proof) return bad("Proof not found", 404);
  if (proof.status === "REVOKED") return bad("Revoked proofs cannot be re-verified");
  if (proof.status === "DISPUTED") return bad("Resolve the open dispute before re-running verification");

  const admin = supabaseAdmin();
  await admin.from("pf_proofs").update({ status: "PENDING", updated_at: new Date().toISOString() }).eq("id", id);
  await logEvent(id, "verification_started", user!.id, {});

  const { data: evidence } = await admin
    .from("pf_evidence")
    .select("id, type, source, description, created_at")
    .eq("proof_id", id)
    .order("created_at", { ascending: true });

  const fileExists = async (path: string): Promise<boolean> => {
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    const base = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
    const { data, error } = await admin.storage.from("pf-evidence").list(dir || undefined, { limit: 100 });
    if (error) throw error;
    return (data ?? []).some((f) => f.name === base);
  };

  let checks: CheckResult[];
  try {
    checks = await runAllChecks(
      { id, start_date: proof.start_date, completion_date: proof.completion_date },
      (evidence ?? []).map((e) => ({ id: e.id, type: e.type, source: e.source, description: e.description, created_at: e.created_at })),
      fileExists
    );
  } catch (e) {
    await admin.from("pf_proofs").update({ status: "DRAFT" }).eq("id", id);
    return bad(`Verification engine failed: ${e instanceof Error ? e.message : "unknown error"}`, 500);
  }

  // Persist every check — the public page renders exactly these rows.
  for (const c of checks) {
    await admin.from("pf_verification_checks").insert({
      proof_id: id,
      check_type: c.check_type,
      target: c.target,
      status: c.status,
      detail: c.detail,
    });
  }

  const coverage = coverageOf(checks);
  const failed = checks.filter((c) => c.status === "failed").length;
  // Honest automated verdict: VERIFIED only when every decisive check passed
  // and there is at least one decisive check. Anything failed -> UNVERIFIED.
  // No decisive checks at all -> stays PENDING ("could not independently verify").
  const newStatus = failed > 0 ? "UNVERIFIED" : coverage !== null ? "VERIFIED" : "PENDING";

  await admin
    .from("pf_proofs")
    .update({ status: newStatus, coverage, updated_at: new Date().toISOString() })
    .eq("id", id);
  await logEvent(id, "verification_completed", user!.id, { status: newStatus, coverage, checks: checks.length });

  return json({ status: newStatus, coverage, checks });
}
