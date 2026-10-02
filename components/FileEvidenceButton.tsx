"use client";

import { useState } from "react";

/** Opens an uploaded evidence file via a server-issued signed URL (access-checked server-side). */
export default function FileEvidenceButton({ evidenceId, fileName }: { evidenceId: string; fileName: string }) {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    try {
      const res = await fetch(`/api/evidence/${evidenceId}/file`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Unavailable");
      window.open(d.url, "_blank", "noopener");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open file");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={open} disabled={busy} className="text-xs font-medium text-cyan-300 hover:text-cyan-200 disabled:opacity-50">
      {busy ? "Opening…" : `View file: ${fileName}`}
    </button>
  );
}
