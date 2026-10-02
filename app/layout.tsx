import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase-server";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "PROOFLY — Universal Proof of Work",
  description: "Don't just say you did the work. Prove it. Create verifiable records of work completed — claim, evidence, verification, shareable proof.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  let username: string | null = null;
  let unread = 0;
  if (user) {
    const { data: prof } = await sb.from("pf_profiles").select("username").eq("id", user.id).maybeSingle();
    username = (prof as { username: string | null } | null)?.username ?? null;
    const { count } = await sb
      .from("pf_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    unread = count ?? 0;
  }

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#050914] font-body text-slate-200 antialiased">
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 500px at 15% -5%, rgba(34,211,238,0.08), transparent 60%), radial-gradient(800px 500px at 90% 10%, rgba(14,165,233,0.07), transparent 60%)",
          }}
        />
        <Navbar userEmail={user?.email ?? null} username={username} unread={unread} />
        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
        <footer className="border-t border-white/10 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:px-6">
            <p className="font-display font-semibold text-slate-300">
              PROOF<span className="text-cyan-400">LY</span>
              <span className="ml-2 font-body font-normal text-slate-500">Universal Proof of Work</span>
            </p>
            <p>Claim what you did. Show the evidence. Let it be checked.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
