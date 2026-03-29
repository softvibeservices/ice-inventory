// src/app/components/Navbar.tsx
// Added "Verify Account" link alongside Login / Register

"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { FaSnowflake } from "react-icons/fa";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#020b2c]/70 border-b border-cyan-400/20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg sm:text-xl font-bold tracking-wide text-white hover:opacity-90 transition"
        >
          <FaSnowflake className="text-cyan-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            IceCream Inventory
          </span>
        </Link>

        {/* ── DESKTOP ACTIONS ── */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-200 hover:text-cyan-300 transition"
          >
            Login
          </Link>

          {/*
            "Verify Account" — shown as a subtle outlined button so it's clearly
            secondary but still easy to find. Useful when a user registered but
            accidentally closed the OTP page before verifying.
          */}
          <Link
            href="/verify-account"
            className="px-4 py-2 rounded-full text-sm font-semibold text-cyan-300
                       border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/10
                       transition"
          >
            Verify Account
          </Link>

          <Link
            href="/register"
            className="px-4 py-2 rounded-full text-sm font-semibold text-white
                       bg-gradient-to-r from-cyan-500 to-blue-600
                       hover:from-cyan-400 hover:to-blue-500
                       shadow-md transition"
          >
            Register
          </Link>
        </div>

        {/* MOBILE TOGGLE */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── MOBILE MENU ── */}
      {isOpen && (
        <div className="md:hidden px-4 pb-4 pt-2 bg-[#020b2c]/95 backdrop-blur-xl border-t border-cyan-400/20">
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="w-full text-center py-2 rounded-lg text-slate-200 hover:bg-white/10 transition"
            >
              Login
            </Link>

            <Link
              href="/verify-account"
              onClick={() => setIsOpen(false)}
              className="w-full text-center py-2 rounded-lg text-cyan-300
                         border border-cyan-500/40 hover:bg-cyan-500/10 transition"
            >
              Verify Account
            </Link>

            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="w-full text-center py-2 rounded-lg font-semibold
                         bg-gradient-to-r from-cyan-500 to-blue-600
                         text-white hover:from-cyan-400 hover:to-blue-500 transition"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}