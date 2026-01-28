"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

interface HeaderProps {
  showNav?: boolean;
}

export function Header({ showNav = true }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-xl font-bold text-white">S</span>
            </div>
            <span className="text-xl font-bold text-zinc-100 hidden sm:block">Solo RE Agent</span>
          </Link>

          {/* Navigation */}
          {showNav && (
            <nav className="hidden md:flex items-center gap-6">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/today">Today</NavLink>
              <NavLink href="/map">Map</NavLink>
            </nav>
          )}

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <>
                <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
                  <div className="md:hidden border-b border-zinc-800">
                    <Link href="/dashboard" className="block px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors" onClick={() => setMenuOpen(false)}>
                      Dashboard
                    </Link>
                    <Link href="/today" className="block px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors" onClick={() => setMenuOpen(false)}>
                      Today
                    </Link>
                    <Link href="/map" className="block px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors" onClick={() => setMenuOpen(false)}>
                      Map
                    </Link>
                  </div>
                  <Link href="/admin/invites" className="block px-4 py-3 text-zinc-300 hover:bg-zinc-800 transition-colors" onClick={() => setMenuOpen(false)}>
                    Admin
                  </Link>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {signingOut ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors"
    >
      {children}
    </Link>
  );
}

