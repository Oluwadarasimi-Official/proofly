"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/proofs", label: "My Proofs" },
  { href: "/proofs/new", label: "Create Proof" },
  { href: "/verify", label: "Verification" },
  { href: "/collections", label: "Collections" },
  { href: "/search", label: "Search" },
];

export default function Navbar({
  userEmail,
  username,
  unread,
}: {
  userEmail: string | null;
  username: string | null;
  unread: number;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const linkCls = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      path === href || (href !== "/dashboard" && path.startsWith(href))
        ? "bg-cyan-400/15 text-cyan-300"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050914]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href={userEmail ? "/dashboard" : "/"} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_24px_rgba(34,211,238,0.35)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#04121a" strokeWidth="2.4">
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            PROOF<span className="text-cyan-400">LY</span>
          </span>
        </Link>

        {userEmail ? (
          <>
            <nav className="hidden items-center gap-1 lg:flex">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={linkCls(l.href)}>
                  {l.label}
                  {l.href === "/verify" && unread > 0 && (
                    <span className="ml-1.5 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-bold text-[#04121a]">
                      {unread}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href={username ? `/@${username}` : "/profile"}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                Profile
              </Link>
              <Link
                href="/settings"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                Settings
              </Link>
              <button
                onClick={signOut}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-slate-300 hover:border-rose-400/40 hover:text-rose-300"
              >
                Sign out
              </button>
            </div>
            <button
              className="rounded-lg p-2 text-slate-300 hover:bg-white/5 lg:hidden"
              onClick={() => setOpen(!open)}
              aria-label="Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-[#04121a] hover:brightness-110"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
      {open && userEmail && (
        <nav className="border-t border-white/10 px-4 py-3 lg:hidden">
          <div className="grid gap-1">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={linkCls(l.href)} onClick={() => setOpen(false)}>
                {l.label}
                {l.href === "/verify" && unread > 0 && (
                  <span className="ml-1.5 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-bold text-[#04121a]">
                    {unread}
                  </span>
                )}
              </Link>
            ))}
            <Link href={username ? `/@${username}` : "/profile"} className={linkCls("/profile")} onClick={() => setOpen(false)}>
              Profile
            </Link>
            <Link href="/settings" className={linkCls("/settings")} onClick={() => setOpen(false)}>
              Settings
            </Link>
            <button
              onClick={signOut}
              className="rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-300 hover:bg-white/5"
            >
              Sign out
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
