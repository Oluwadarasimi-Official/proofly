"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard } from "./ui";

interface Notif { id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string; }

export default function NotificationsPanel() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/notifications");
    const d = await r.json();
    setNotifs(d.notifications ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read_all" }) });
    load();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div>
      {notifs.length > 0 && (
        <button onClick={markAll} className="mb-3 text-xs font-medium text-cyan-300 hover:text-cyan-200">Mark all as read</button>
      )}
      <div className="space-y-3">
        {notifs.length === 0 && <GlassCard className="p-5 text-sm text-slate-500">No notifications.</GlassCard>}
        {notifs.map((n) => (
          <Link key={n.id} href={n.link ?? "/verify"}>
            <GlassCard className={`p-4 transition hover:border-cyan-400/30 ${n.read ? "opacity-55" : "border-cyan-400/20"}`}>
              <p className="text-sm font-semibold text-white">{n.title}</p>
              {n.body && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{n.body}</p>}
              <p className="mt-2 text-[11px] text-slate-600">{new Date(n.created_at).toLocaleString()}</p>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
