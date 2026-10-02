import type { ReactNode } from "react";

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-500/15 text-slate-300 border-slate-400/30",
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  VERIFIED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  UNVERIFIED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  DISPUTED: "bg-orange-500/15 text-orange-300 border-orange-400/30",
  REVOKED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-widest uppercase ${style} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-semibold text-white">{children}</h2>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <GlassCard className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38e1ff" strokeWidth="1.8">
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="font-display text-base font-semibold text-white">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-400">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </GlassCard>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-200">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-white/10 bg-[#0a1120]/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-semibold text-[#04121a] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

export function CheckIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.4">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2.4">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function CoverageRing({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-600">
          <span className="text-lg text-slate-500">?</span>
        </div>
        <p className="max-w-[220px] text-xs leading-relaxed text-slate-400">
          Could not independently verify. No decisive technical check completed.
        </p>
      </div>
    );
  }
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const color = value >= 80 ? "#34d399" : value >= 50 ? "#fbbf24" : "#fb7185";
  return (
    <div className="flex items-center gap-3">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 36 36)"
        />
        <text x="36" y="41" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">{value}%</text>
      </svg>
      <p className="max-w-[220px] text-xs leading-relaxed text-slate-400">
        Evidence Coverage — from decisive technical checks only. Unverifiable items are excluded, never counted as passes.
      </p>
    </div>
  );
}
