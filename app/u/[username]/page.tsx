import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { requestOrigin } from "@/lib/site-server";
import { GlassCard, EmptyState } from "@/components/ui";
import ProofCard from "@/components/ProofCard";
import { CopyLinkButton } from "@/components/proof-actions";

type Ctx = { params: Promise<{ username: string }> };

export default async function PublicProfilePage({ params }: Ctx) {
  const { username } = await params;
  const sb = await supabaseServer();
  const { data: profile } = await sb
    .from("pf_profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) notFound();

  const [{ data: proofs }, { data: collections }] = await Promise.all([
    sb
      .from("pf_proofs")
      .select("id, proof_id, title, claim, category, status, visibility, coverage, views_count, completion_date, created_at")
      .eq("owner_id", profile.id)
      .eq("visibility", "public")
      .order("created_at", { ascending: false }),
    sb.from("pf_collections").select("id, title, description").eq("owner_id", profile.id).eq("visibility", "public").order("created_at", { ascending: false }),
  ]);

  const verified = (proofs ?? []).filter((p) => p.status === "VERIFIED").length;
  const social = (profile.social_links ?? {}) as Record<string, string>;
  const origin = await requestOrigin();

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <GlassCard className="relative overflow-hidden p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/30 to-blue-600/30 font-display text-3xl font-bold text-cyan-200">
              {(profile.name ?? profile.username ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{profile.name ?? `@${profile.username}`}</h1>
              <p className="font-mono text-sm text-cyan-400/80">@{profile.username}</p>
              {profile.organization && <p className="mt-1 text-sm text-slate-400">{profile.organization}</p>}
            </div>
          </div>
          <CopyLinkButton url={`${origin}/@${profile.username}`} label="Copy profile link" />
        </div>
        {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">{profile.bio}</p>}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">Website ↗</a>}
          {social.x && <a href={social.x} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">X ↗</a>}
          {social.linkedin && <a href={social.linkedin} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">LinkedIn ↗</a>}
          {social.github && <a href={social.github} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">GitHub ↗</a>}
          {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">Instagram ↗</a>}
        </div>
        <div className="mt-5 flex gap-6 border-t border-white/5 pt-5">
          <div><p className="font-display text-xl font-bold text-white">{(proofs ?? []).length}</p><p className="text-[11px] uppercase tracking-widest text-slate-500">Proofs</p></div>
          <div><p className="font-display text-xl font-bold text-emerald-300">{verified}</p><p className="text-[11px] uppercase tracking-widest text-slate-500">Verified</p></div>
          <div><p className="font-display text-xl font-bold text-white">{(collections ?? []).length}</p><p className="text-[11px] uppercase tracking-widest text-slate-500">Collections</p></div>
        </div>
      </GlassCard>

      {(collections ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Collections</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(collections ?? []).map((c) => (
              <Link key={c.id} href={`/collections/${c.id}`}>
                <GlassCard className="p-5 transition hover:border-cyan-400/30">
                  <p className="font-display text-base font-semibold text-white">{c.title}</p>
                  {c.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{c.description}</p>}
                </GlassCard>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Public proofs</h2>
        {(proofs ?? []).length === 0 ? (
          <EmptyState title="No public proofs" hint="This user hasn't published any public proofs yet." />
        ) : (
          <div className="grid gap-4">
            {(proofs ?? []).map((p) => (
              <ProofCard key={p.id} proof={{ ...p, owner: { username: profile.username, name: profile.name } }} publicProof />
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-600">Public proof cards link to the shareable proof page.</p>
      </div>
    </div>
  );
}
