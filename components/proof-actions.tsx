"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnGhost, btnDanger, Field, inputCls } from "./ui";
import AiAssist from "./AiAssist";

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "Request failed");
  return d;
}

export function RunVerificationButton({ proofUuid }: { proofUuid: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={btnPrimary}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const d = await api(`/api/proofs/${proofUuid}/verify`, "POST");
          alert(`Verification complete: ${d.status}${d.coverage !== null ? ` — coverage ${d.coverage}%` : " — could not independently verify"}`);
          router.refresh();
        } catch (e) {
          alert(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Running real checks…" : "Run verification"}
    </button>
  );
}

export function RevokeButton({ proofUuid }: { proofUuid: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={btnDanger}
      disabled={busy}
      onClick={async () => {
        const reason = prompt("Revoke this proof? The record is preserved and marked REVOKED. Optional reason:");
        if (reason === null) return;
        setBusy(true);
        try {
          await api(`/api/proofs/${proofUuid}/revoke`, "POST", { reason });
          router.refresh();
        } catch (e) {
          alert(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Revoking…" : "Revoke proof"}
    </button>
  );
}

export function DeleteProofButton({ proofUuid }: { proofUuid: string }) {
  const router = useRouter();
  return (
    <button
      className={btnDanger}
      onClick={async () => {
        if (!confirm("Delete this proof permanently? This cannot be undone.")) return;
        try {
          await api(`/api/proofs/${proofUuid}`, "DELETE");
          router.push("/proofs");
        } catch (e) {
          alert(e instanceof Error ? e.message : "Failed");
        }
      }}
    >
      Delete proof
    </button>
  );
}

export function CopyLinkButton({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={btnGhost}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          prompt("Copy this link:", url);
          return;
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

/** Fires once per page load to record a real view. */
export function ViewRecorder({ proofUuid }: { proofUuid: string }) {
  useEffect(() => {
    fetch(`/api/proofs/${proofUuid}/views`, { method: "POST" }).catch(() => {});
  }, [proofUuid]);
  return null;
}

export function RequestVerifierForm({ proofUuid }: { proofUuid: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api(`/api/proofs/${proofUuid}/request-verification`, "POST", { username, message });
          alert("Verification request sent.");
          setUsername("");
          setMessage("");
          router.refresh();
        } catch (e2) {
          alert(e2 instanceof Error ? e2.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Verifier's Proofly username" hint="They'll get a notification and can Verify / Reject / Request changes.">
        <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} placeholder="@username" required />
      </Field>
      <Field label="Message (optional)">
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputCls} min-h-[70px]`} placeholder="Why are you a good verifier for this work?" maxLength={1000} />
      </Field>
      <button type="submit" disabled={busy} className={btnPrimary}>
        {busy ? "Sending…" : "Send verification request"}
      </button>
    </form>
  );
}

export function ResolveRequestButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: string) {
    const comment = prompt(action === "verify" ? "Confirm verification (optional comment):" : "Add a comment (optional):") ?? "";
    setBusy(true);
    try {
      await api(`/api/verification-requests/${requestId}`, "PATCH", { action, comment });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button disabled={busy} onClick={() => act("verify")} className="rounded-lg bg-emerald-500/15 border border-emerald-400/30 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">Verify</button>
      <button disabled={busy} onClick={() => act("request_changes")} className="rounded-lg bg-amber-500/15 border border-amber-400/30 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/25 disabled:opacity-50">Request changes</button>
      <button disabled={busy} onClick={() => act("reject")} className="rounded-lg bg-rose-500/15 border border-rose-400/30 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50">Reject</button>
    </div>
  );
}

export function ResolveDisputeButtons({ proofUuid, disputeId }: { proofUuid: string; disputeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: "dismissed" | "resolved") {
    if (!confirm(action === "dismissed" ? "Dismiss this dispute as invalid?" : "Mark this dispute resolved (you addressed the issue)?")) return;
    setBusy(true);
    try {
      await api(`/api/proofs/${proofUuid}/dispute`, "PATCH", { dispute_id: disputeId, action });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex gap-2">
      <button disabled={busy} onClick={() => act("dismissed")} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-400/40 disabled:opacity-50">Dismiss</button>
      <button disabled={busy} onClick={() => act("resolved")} className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50">Mark resolved</button>
    </div>
  );
}

const DISPUTE_OPTS = [
  { value: "incorrect_info", label: "Incorrect information" },
  { value: "misleading_evidence", label: "Misleading evidence" },
  { value: "wrong_attribution", label: "Wrong attribution" },
  { value: "unavailable_evidence", label: "Unavailable evidence" },
  { value: "other", label: "Other" },
];

export function DisputeForm({ proofUuid }: { proofUuid: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("incorrect_info");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return <p className="text-sm text-orange-300">Report submitted. The proof is now marked DISPUTED pending review.</p>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-slate-500 underline-offset-2 hover:text-orange-300 hover:underline">
        Report this proof
      </button>
    );
  return (
    <form
      className="mt-2 space-y-3 rounded-xl border border-orange-400/25 bg-orange-500/[0.06] p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api(`/api/proofs/${proofUuid}/dispute`, "POST", { reason, detail });
          setDone(true);
        } catch (e2) {
          alert(e2 instanceof Error ? e2.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm font-semibold text-orange-200">Report this proof</p>
      <Field label="Reason">
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
          {DISPUTE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      <Field label="Details (optional)">
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} className={`${inputCls} min-h-[70px]`} maxLength={2000} placeholder="What exactly is wrong?" />
      </Field>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-lg border border-orange-400/40 bg-orange-500/15 px-4 py-2 text-sm font-semibold text-orange-200 hover:bg-orange-500/25 disabled:opacity-50">
          {busy ? "Submitting…" : "Submit report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
      </div>
    </form>
  );
}

export function EditProofForm({ proof }: { proof: Record<string, unknown> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    title: String(proof.title ?? ""),
    claim: String(proof.claim ?? ""),
    description: String(proof.description ?? ""),
    contribution: String(proof.contribution ?? ""),
    start_date: String(proof.start_date ?? ""),
    completion_date: String(proof.completion_date ?? ""),
    visibility: String(proof.visibility ?? "private"),
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });
  if (!open)
    return <button onClick={() => setOpen(true)} className={btnGhost}>Edit details</button>;
  return (
    <form
      className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api(`/api/proofs/${proof.id}`, "PATCH", {
            ...f,
            start_date: f.start_date || null,
            completion_date: f.completion_date || null,
          });
          setOpen(false);
          router.refresh();
        } catch (e2) {
          alert(e2 instanceof Error ? e2.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Title"><input value={f.title} onChange={set("title")} className={inputCls} required /></Field>
      <Field label="Claim"><textarea value={f.claim} onChange={set("claim")} className={`${inputCls} min-h-[80px]`} required /></Field>
      <Field label="Description"><textarea value={f.description} onChange={set("description")} className={`${inputCls} min-h-[70px]`} /></Field>
      <Field label="Contribution"><textarea value={f.contribution} onChange={set("contribution")} className={`${inputCls} min-h-[60px]`} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date"><input type="date" value={f.start_date} onChange={set("start_date")} className={inputCls} /></Field>
        <Field label="Completion date"><input type="date" value={f.completion_date} onChange={set("completion_date")} className={inputCls} /></Field>
      </div>
      <Field label="Visibility">
        <select value={f.visibility} onChange={set("visibility")} className={inputCls}>
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="private">Private</option>
        </select>
      </Field>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Save changes"}</button>
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>
      </div>
    </form>
  );
}

export { AiAssist };
