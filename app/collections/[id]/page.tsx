import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer, currentUser } from "@/lib/supabase-server";
import { GlassCard } from "@/components/ui";
import ProofCard from "@/components/ProofCard";
import CollectionDetailClient from "@/components/CollectionDetailClient";

type Ctx = { params: Promise<{ id: string }> };

export default async function CollectionPage({ params }: Ctx) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await currentUser();
  const sb = await supabaseServer();

  const { data: col } = await sb.from("pf_collections").select("*").eq("id", id).maybeSingle();
  if (!col) notFound();
  const isOwner = user?.id === col.owner_id;
  if (!isOwner && col.visibility !== "public") {
    if (!user) redirect("/login");
    notFound();
  }

  if (isOwner) {
    return (
      <div className="animate-fade-up">
        <Link href="/collections" className="text-sm text-slate-400 hover:text-cyan-300">← Collections</Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">{col.title}</h1>
        <div className="mt-6"><CollectionDetailClient collectionId={id} /></div>
      </div>
    );
  }

  // Public view
  const { data: links } = await sb.from("pf_collection_proofs").select("proof_id").eq("collection_id", id);
  const proofIds = (links ?? []).map((l) => l.proof_id);
  let proofs: unknown[] = [];
  let ownerName = "";
  if (proofIds.length) {
    const { data } = await sb
      .from("pf_proofs")
      .select("id, proof_id, title, claim, category, status, coverage, views_count, completion_date, created_at, owner_id")
      .in("id", proofIds)
      .eq("visibility", "public");
    proofs = data ?? [];
  }
  const { data: owner } = await sb.from("pf_profiles").select("username, name").eq("id", col.owner_id).maybeSingle();
  ownerName = (owner as { name?: string | null; username?: string | null } | null)?.name ?? "";

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <p className="text-xs uppercase tracking-widest text-slate-500">Collection{ownerName ? ` by ${ownerName}` : ""}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{col.title}</h1>
      {col.description && <p className="mt-2 text-sm text-slate-400">{col.description}</p>}
      <div className="mt-6 grid gap-4">
        {proofs.length === 0 && <GlassCard className="p-6 text-sm text-slate-500">No public proofs in this collection.</GlassCard>}
        {(proofs as Parameters<typeof ProofCard>[0]["proof"][]).map((p) => (
          <ProofCard key={p.id} proof={{ ...p, owner: { username: (owner as { username?: string | null } | null)?.username ?? null, name: ownerName } }} publicProof />
        ))}
      </div>
    </div>
  );
}
