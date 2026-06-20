"use client";
// src/app/components/Navbar.tsx

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <span className="text-white text-lg font-bold">IS</span>
          </div>
          <span className="font-semibold text-gray-900">IceSaathi</span>
        </Link>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Login
          </Link>
          <Link
            href="/verify-account"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Verify Account
          </Link>
          <Link
            href="/register"
            className="ml-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Register
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={20} className="text-gray-900" /> : <Menu size={20} className="text-gray-900" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-2">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Login
            </Link>
            <Link
              href="/verify-account"
              onClick={() => setIsOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Verify Account
            </Link>
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}