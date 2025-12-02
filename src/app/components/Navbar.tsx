// icecream-inventory/src/app/components/Navbar.tsx

"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="text-2xl font-extrabold tracking-wide">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <span role="img" aria-label="icecream">🍦</span> IceCream Inventory
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-8 font-medium">
          <Link
            href="/login"
            className="px-3 py-2 rounded-lg hover:bg-white/10 transition"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-3 py-2 rounded-lg bg-yellow-400 text-blue-900 font-semibold hover:bg-yellow-300 transition"
          >
            Register
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded hover:bg-white/10 transition"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-blue-700 text-white px-6 py-4 space-y-3">
          <Link
            href="/login"
            className="block px-3 py-2 rounded-lg hover:bg-white/10 transition"
            onClick={() => setIsOpen(false)}
          >
            Login
          </Link>
          <Link
            href="/register"
            className="block px-3 py-2 rounded-lg bg-yellow-400 text-blue-900 font-semibold hover:bg-yellow-300 transition"
            onClick={() => setIsOpen(false)}
          >
            Register
          </Link>
        </div>
      )}
    </nav>
  );
}
