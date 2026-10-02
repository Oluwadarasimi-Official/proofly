import Link from "next/link";
import { GlassCard, StatusBadge } from "./ui";

export interface ProofSummary {
  id: string;
  proof_id: string;
  title: string;
  claim: string;
  category: string;
  status: string;
  visibility: string;
  coverage: number | null;
  views_count: number;
  completion_date: string | null;
  created_at: string;
  owner?: { username: string | null; name: string | null } | null;
  evidence_count?: number;
}

export default function ProofCard({ proof, linkPrefix = "/proofs", publicProof = false }: { proof: ProofSummary; linkPrefix?: string; publicProof?: boolean }) {
  const href = publicProof ? `/p/${proof.proof_id}` : `${linkPrefix}/${proof.id}`;
  return (
    <Link href={href}>
      <GlassCard className="group p-5 transition hover:border-cyan-400/30 hover:bg-white/[0.06]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-wider text-cyan-400/80">{proof.proof_id}</p>
            <h3 className="mt-1 truncate font-display text-base font-semibold text-white group-hover:text-cyan-200">
              {proof.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">{proof.claim}</p>
          </div>
          <StatusBadge status={proof.status} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="rounded-md bg-white/5 px-2 py-0.5 font-medium text-slate-300">{proof.category}</span>
          {proof.owner?.username && <span>@{proof.owner.username}</span>}
          {typeof proof.evidence_count === "number" && <span>{proof.evidence_count} evidence</span>}
          {proof.coverage !== null && proof.coverage !== undefined && (
            <span className="text-slate-300">Coverage {proof.coverage}%</span>
          )}
          <span>{proof.views_count} views</span>
        </div>
      </GlassCard>
    </Link>
  );
}
