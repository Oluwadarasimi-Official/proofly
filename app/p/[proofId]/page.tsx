import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { proofPublicUrl, qrDataUrl } from "@/lib/site";
import { GlassCard, StatusBadge, SectionTitle, CoverageRing, CheckIcon } from "@/components/ui";
import SnapshotCard from "@/components/SnapshotCard";
import FileEvidenceButton from "@/components/FileEvidenceButton";
import { ViewRecorder, CopyLinkButton, DisputeForm } from "@/components/proof-actions";

type Ctx = { params: Promise<{ proofId: string }> };

const EV_LABELS: Record<string, string> = {
  url: "Link", live_site: "Live website", github_repo: "GitHub repository", github_commit: "GitHub commit",
  image: "Image", pdf: "Document", video: "Video", certificate: "Certificate", file: "File",
};

export default async function PublicProofPage({ params }: Ctx) {
  const { proofId } = await params;
  const sb = await supabaseServer();

  const { data: proof } = await sb
    .from("pf_proofs")
    .select("*")
    .eq("proof_id", proofId.toUpperCase())
    .neq("visibility", "private")
    .maybeSingle();
  if (!proof) notFound();

  const [{ data: evidence }, { data: checks }, { data: events }, { data: creator }] = await Promise.all([
    sb.from("pf_evidence").select("id, type, source, description, file_name, visibility, created_at").eq("proof_id", proof.id).eq("visibility", "public").order("created_at", { ascending: true }),
    sb.from("pf_verification_checks").select("check_type, target, status, detail, checked_at").eq("proof_id", proof.id).order("checked_at", { ascending: false }).limit(60),
    sb.from("pf_proof_events").select("event_type, created_at").eq("proof_id", proof.id).order("created_at", { ascending: true }).limit(40),
    sb.from("pf_profiles").select("username, name").eq("id", proof.owner_id).maybeSingle(),
  ]);

  const publicUrl = proofPublicUrl(proof.proof_id);
  const creatorName = (creator as { name?: string | null } | null)?.name ?? "Proofly user";
  const creatorUsername = (creator as { username?: string | null } | null)?.username;
  const verifiedAt = checks?.[0]?.checked_at ? new Date(checks[0].checked_at).toLocaleDateString() : null;
  const isFile = (t: string) => ["image", "pdf", "video", "certificate", "file"].includes(t);

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <ViewRecorder proofUuid={proof.id} />

      {/* Certificate hero */}
      <GlassCard className="relative overflow-hidden p-8 text-center sm:p-12">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <p className="font-display text-xs font-bold tracking-[0.35em] text-slate-400">PROOF<span className="text-cyan-400">LY</span></p>
        <div className="mt-4 flex justify-center"><StatusBadge status={proof.status} className="text-sm px-5 py-1.5" /></div>
        <h1 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">{proof.title}</h1>
        <p className="mt-3 font-mono text-sm tracking-[0.2em] text-cyan-400">{proof.proof_id}</p>
        <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Creator</p>
            <p className="mt-1 font-semibold text-white">
              {creatorUsername ? <Link href={`/@${creatorUsername}`} className="text-cyan-300 hover:underline">{creatorName}</Link> : creatorName}
            </p>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Completed</p>
            <p className="mt-1 font-semibold text-white">{proof.completion_date ?? "—"}</p>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Views</p>
            <p className="mt-1 font-semibold text-white">{proof.views_count}</p>
          </div>
        </div>
      </GlassCard>

      {proof.status === "REVOKED" && (
        <div className="mt-6 rounded-2xl border border-zinc-500/30 bg-zinc-500/10 px-5 py-4 text-center">
          <p className="text-sm font-semibold text-zinc-300">This proof was revoked by its creator{proof.revoked_at ? ` on ${new Date(proof.revoked_at).toLocaleDateString()}` : ""}.</p>
          <p className="mt-1 text-xs text-zinc-500">The record is preserved for transparency.</p>
        </div>
      )}
      {proof.status === "DISPUTED" && (
        <div className="mt-6 rounded-2xl border border-orange-400/30 bg-orange-500/10 px-5 py-4 text-center">
          <p className="text-sm font-semibold text-orange-300">This proof is under dispute.</p>
          <p className="mt-1 text-xs text-orange-200/70">Public reports are being reviewed. The record stays visible during review.</p>
        </div>
      )}

      {/* CLAIM / EVIDENCE / CHECK / VERIFICATION */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Claim — what they said</p>
          <p className="mt-2 font-display text-lg font-semibold leading-snug text-white">“{proof.claim}”</p>
          {proof.description && <p className="mt-3 text-sm leading-relaxed text-slate-400">{proof.description}</p>}
          {proof.contribution && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Their contribution</p>
              <p className="mt-1 text-sm text-slate-300">{proof.contribution}</p>
            </div>
          )}
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Verification — what was confirmed</p>
          <div className="mt-3"><CoverageRing value={proof.coverage} /></div>
          {verifiedAt && <p className="mt-2 text-xs text-slate-500">Verified {verifiedAt}</p>}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[["Claim", "their words"], ["Evidence", "submitted"], ["Check", "inspected"]].map(([a, b]) => (
              <div key={a} className="rounded-xl border border-white/10 p-2.5">
                <p className="text-xs font-bold text-slate-200">{a}</p>
                <p className="text-[10px] text-slate-500">{b}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* EVIDENCE */}
      <div className="mt-8">
        <SectionTitle>Evidence ({(evidence ?? []).length})</SectionTitle>
        {(evidence ?? []).length === 0 && (
          <GlassCard className="p-6 text-sm text-slate-500">No public evidence attached to this proof.</GlassCard>
        )}
        <div className="space-y-3">
          {(evidence ?? []).map((e) => (
            <GlassCard key={e.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{EV_LABELS[e.type] ?? e.type}</p>
                <span className="text-[11px] text-slate-600">{new Date(e.created_at).toLocaleDateString()}</span>
              </div>
              {e.description && <p className="mt-1 text-sm text-slate-400">{e.description}</p>}
              <div className="mt-2">
                {isFile(e.type) ? (
                  <FileEvidenceButton evidenceId={e.id} fileName={e.file_name ?? "file"} />
                ) : (
                  <a href={e.source} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-xs text-cyan-300 hover:underline">
                    {e.source}
                  </a>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* CHECKS */}
      <div className="mt-8">
        <SectionTitle hint="Real technical checks Proofly performed. 'Could not verify' means exactly that — never a pass.">
          Verification checks
        </SectionTitle>
        <GlassCard className="divide-y divide-white/5">
          {(checks ?? []).length === 0 && <p className="p-6 text-sm text-slate-500">No automated checks have been run on this proof yet.</p>}
          {(checks ?? []).map((c, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-4">
              <span className="mt-0.5">
                {c.status === "passed" ? <CheckIcon ok /> : c.status === "failed" ? <CheckIcon ok={false} /> : <span className="text-base text-slate-500">?</span>}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  {c.check_type.replace(/_/g, " ")}
                  <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.status === "passed" ? "bg-emerald-500/15 text-emerald-300" : c.status === "failed" ? "bg-rose-500/15 text-rose-300" : "bg-slate-500/15 text-slate-400"}`}>
                    {c.status === "unverifiable" ? "could not verify" : c.status}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{c.detail}</p>
              </div>
            </div>
          ))}
        </GlassCard>
      </div>

      {/* TIMELINE + SHARE */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6">
          <p className="mb-3 font-display text-sm font-semibold text-white">Verification timeline</p>
          {(events ?? []).length === 0 && <p className="text-sm text-slate-500">No recorded events.</p>}
          <ol className="relative space-y-3 border-l border-white/10 pl-5">
            {(events ?? []).map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-cyan-400/70" />
                <p className="text-sm capitalize text-slate-200">{e.event_type.replace(/_/g, " ")}</p>
                <p className="text-[11px] text-slate-500">{new Date(e.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center p-6 text-center">
          <p className="font-display text-sm font-semibold text-white">Share this proof</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={await qrDataUrl(publicUrl)} alt={`QR code for ${proof.proof_id}`} width={150} height={150} className="mt-4 rounded-xl border border-white/10 bg-white p-2" />
          <p className="mt-2 font-mono text-xs text-slate-500">{publicUrl.replace(/^https?:\/\//, "")}</p>
          <div className="mt-4"><CopyLinkButton url={publicUrl} label="Copy proof link" /></div>
        </GlassCard>
      </div>

      {/* SNAPSHOT */}
      {proof.status === "VERIFIED" && (
        <div className="mt-8">
          <SectionTitle hint="A shareable card for LinkedIn, X, portfolios and CVs.">Proof snapshot</SectionTitle>
          <SnapshotCard
            proofId={proof.proof_id}
            title={proof.title}
            creator={creatorName}
            verifiedAt={verifiedAt ?? new Date(proof.updated_at).toLocaleDateString()}
            evidenceCount={(evidence ?? []).length}
            qrDataUrl={await qrDataUrl(publicUrl)}
            publicUrl={publicUrl}
          />
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <DisputeForm proofUuid={proof.id} />
      </div>
      <p className="mt-6 text-center text-xs text-slate-600">
        Proofly separates claim, evidence, checks and verification. Automated checks never declare work genuine on their own.
      </p>
    </div>
  );
}
