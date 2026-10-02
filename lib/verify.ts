// PROOFLY verification engine — performs REAL, independent technical checks.
// It never fabricates results: anything that cannot be confirmed is reported
// as "unverifiable" and excluded from the Evidence Coverage score.

export type CheckStatus = "passed" | "failed" | "unverifiable";

export interface CheckResult {
  check_type: string;
  target: string | null;
  status: CheckStatus;
  detail: string;
}

export interface EvidenceItem {
  id: string;
  type: string;
  source: string;
  description: string | null;
  created_at: string;
}

export interface ProofForVerify {
  id: string;
  start_date: string | null;
  completion_date: string | null;
}

const FETCH_TIMEOUT_MS = 9000;

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const m = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
}

function parseGitHubCommit(url: string): { owner: string; repo: string; sha: string } | null {
  const m = url.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/\s?#]+)\/([^/\s?#]+)\/(?:commit|pull)\/([0-9a-f]{7,40})/i
  );
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, ""), sha: m[3] };
}

async function checkUrlReachable(target: string): Promise<CheckResult> {
  const base = { check_type: "url_reachable", target };
  let url: URL;
  try {
    url = new URL(target);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { ...base, status: "unverifiable", detail: "Not an http(s) URL — could not independently verify." };
    }
  } catch {
    return { ...base, status: "unverifiable", detail: "Malformed URL — could not independently verify." };
  }
  try {
    let res: Response;
    try {
      res = await fetchWithTimeout(target, { method: "HEAD" });
    } catch (e) {
      // Some servers reject HEAD; retry with GET (no body read).
      if (e instanceof Error && e.name === "AbortError") throw e;
      res = await fetchWithTimeout(target, { method: "GET" });
    }
    if (res.status >= 200 && res.status < 400) {
      return { ...base, status: "passed", detail: `Responded with HTTP ${res.status}.` };
    }
    return { ...base, status: "failed", detail: `Responded with HTTP ${res.status} — resource appears unavailable.` };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ...base, status: "unverifiable", detail: "Request timed out — could not independently verify." };
    }
    const msg = e instanceof Error ? e.message : "network error";
    if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(msg)) {
      return { ...base, status: "failed", detail: `Domain could not be resolved (${url.hostname}).` };
    }
    if (/ECONNREFUSED|ECONNRESET/i.test(msg)) {
      return { ...base, status: "failed", detail: "Connection refused by the host." };
    }
    return { ...base, status: "unverifiable", detail: `Network error (${msg}) — could not independently verify.` };
  }
}

async function checkGitHubRepo(target: string): Promise<CheckResult> {
  const base = { check_type: "github_repo", target };
  const parsed = parseGitHubRepo(target);
  if (!parsed) {
    return { ...base, status: "unverifiable", detail: "Not a recognizable github.com repository URL — could not independently verify." };
  }
  try {
    const res = await fetchWithTimeout(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers: { "User-Agent": "proofly-verifier", Accept: "application/vnd.github+json" } }
    );
    if (res.status === 200) {
      const j = (await res.json()) as { description?: string | null; private?: boolean };
      return {
        ...base,
        status: "passed",
        detail: `Repository ${parsed.owner}/${parsed.repo} exists on GitHub${j.description ? ` — "${j.description.slice(0, 120)}"` : ""}.`,
      };
    }
    if (res.status === 404) {
      return { ...base, status: "failed", detail: `Repository ${parsed.owner}/${parsed.repo} was not found on GitHub (404).` };
    }
    if (res.status === 403) {
      return { ...base, status: "unverifiable", detail: "GitHub API rate limit reached — could not independently verify." };
    }
    return { ...base, status: "unverifiable", detail: `GitHub API returned HTTP ${res.status} — could not independently verify.` };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ...base, status: "unverifiable", detail: "GitHub API timed out — could not independently verify." };
    }
    return { ...base, status: "unverifiable", detail: "Could not reach the GitHub API — could not independently verify." };
  }
}

async function checkGitHubCommit(target: string): Promise<CheckResult> {
  const base = { check_type: "github_commit", target };
  const parsed = parseGitHubCommit(target);
  if (!parsed) {
    // Fall back: if it's a github.com URL at all, check repo existence instead.
    const repo = parseGitHubRepo(target);
    if (repo) return checkGitHubRepo(target);
    return { ...base, status: "unverifiable", detail: "Not a recognizable GitHub commit URL — could not independently verify." };
  }
  try {
    const res = await fetchWithTimeout(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits/${parsed.sha}`,
      { headers: { "User-Agent": "proofly-verifier", Accept: "application/vnd.github+json" } }
    );
    if (res.status === 200) {
      const j = (await res.json()) as { commit?: { message?: string } };
      const msg = j.commit?.message?.split("\n")[0]?.slice(0, 100);
      return { ...base, status: "passed", detail: `Commit ${parsed.sha.slice(0, 7)} exists in ${parsed.owner}/${parsed.repo}${msg ? ` — "${msg}"` : ""}.` };
    }
    if (res.status === 404) {
      return { ...base, status: "failed", detail: `Commit ${parsed.sha.slice(0, 7)} was not found in ${parsed.owner}/${parsed.repo} (404).` };
    }
    if (res.status === 422) {
      return { ...base, status: "failed", detail: `Commit ${parsed.sha.slice(0, 7)} is not a valid commit reference.` };
    }
    return { ...base, status: "unverifiable", detail: `GitHub API returned HTTP ${res.status} — could not independently verify.` };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ...base, status: "unverifiable", detail: "GitHub API timed out — could not independently verify." };
    }
    return { ...base, status: "unverifiable", detail: "Could not reach the GitHub API — could not independently verify." };
  }
}

/** Checks that an uploaded file still exists in storage. Needs a file-exists callback (storage access). */
export async function checkStoredFile(
  target: string,
  exists: (path: string) => Promise<boolean>
): Promise<CheckResult> {
  const base = { check_type: "file_exists", target };
  try {
    const ok = await exists(target);
    return ok
      ? { ...base, status: "passed", detail: "File is present in Proofly storage." }
      : { ...base, status: "failed", detail: "File is missing from Proofly storage." };
  } catch {
    return { ...base, status: "unverifiable", detail: "Storage could not be reached — could not independently verify." };
  }
}

export function checkEvidenceCompleteness(evidence: EvidenceItem[]): CheckResult {
  const base = { check_type: "evidence_completeness", target: null as string | null };
  if (evidence.length === 0) {
    return { ...base, status: "failed", detail: "No evidence items attached to this proof." };
  }
  const incomplete = evidence.filter((e) => !e.type || !e.source || !(e.description ?? "").trim() || !e.created_at);
  if (incomplete.length === 0) {
    return { ...base, status: "passed", detail: `All ${evidence.length} evidence item(s) carry type, source, description and timestamp.` };
  }
  return {
    ...base,
    status: "failed",
    detail: `${incomplete.length} of ${evidence.length} evidence item(s) are missing type, source, description or timestamp.`,
  };
}

export function checkMetadataConsistency(proof: ProofForVerify): CheckResult {
  const base = { check_type: "metadata_consistency", target: null as string | null };
  const problems: string[] = [];
  if (proof.start_date && proof.completion_date && proof.start_date > proof.completion_date) {
    problems.push("start date is after the completion date");
  }
  const today = new Date().toISOString().slice(0, 10);
  if (proof.completion_date && proof.completion_date > today) {
    problems.push("completion date is in the future");
  }
  if (proof.start_date && proof.start_date > today) {
    problems.push("start date is in the future");
  }
  return problems.length === 0
    ? { ...base, status: "passed", detail: "Claim dates are internally consistent." }
    : { ...base, status: "failed", detail: `Date inconsistency: ${problems.join("; ")}.` };
}

/** Coverage counts ONLY decisive checks (passed/failed). Unverifiable checks are excluded. */
export function coverageOf(checks: CheckResult[]): number | null {
  const decisive = checks.filter((c) => c.status !== "unverifiable");
  if (decisive.length === 0) return null;
  const passed = decisive.filter((c) => c.status === "passed").length;
  return Math.round((passed / decisive.length) * 100);
}

const FILE_TYPES = new Set(["image", "pdf", "video", "certificate", "file"]);

/**
 * Runs every applicable real check for a proof's evidence set.
 * `fileExists` is injected so this module never touches storage directly.
 */
export async function runAllChecks(
  proof: ProofForVerify,
  evidence: EvidenceItem[],
  fileExists: (path: string) => Promise<boolean>
): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];
  for (const item of evidence) {
    if (item.type === "github_commit") checks.push(await checkGitHubCommit(item.source));
    else if (item.type === "github_repo") checks.push(await checkGitHubRepo(item.source));
    else if (item.type === "url" || item.type === "live_site") checks.push(await checkUrlReachable(item.source));
    else if (FILE_TYPES.has(item.type)) checks.push(await checkStoredFile(item.source, fileExists));
    else
      checks.push({
        check_type: "manual_review",
        target: item.source,
        status: "unverifiable",
        detail: "This evidence type has no automated check — a human verifier must confirm it.",
      });
  }
  checks.push(checkEvidenceCompleteness(evidence));
  checks.push(checkMetadataConsistency(proof));
  return checks;
}
