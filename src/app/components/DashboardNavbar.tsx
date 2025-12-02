// icecream-inventory/src/app/components/DashboardNavbar.tsx




"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Package,
  Boxes,
  UserCircle,
  Users,
  FileText,
  LayoutDashboard,
} from "lucide-react";

export default function DashboardNavbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/products", label: "Product Management", icon: Package },
    { href: "/dashboard/stocks", label: "Stock Management", icon: Boxes },
    { href: "/dashboard/customers", label: "Customer Management", icon: Users },
    { href: "/dashboard/billing", label: "Bill Generation", icon: FileText },
  ];

  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left - Logo */}
        <Link
          href="/dashboard"
          className="flex items-center space-x-2 hover:opacity-90 transition"
        >
          <Image
            src="/logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="object-contain rounded-full border border-white shadow-md"
            priority
          />
          <span className="font-bold text-xl text-white tracking-wide">
            IceCream Inventory
          </span>
        </Link>

        {/* Center - Navigation Links */}
        <nav className="hidden md:flex space-x-6 font-medium text-white">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                pathname === href
                  ? "bg-white text-blue-700 shadow-md"
                  : "hover:bg-blue-500/30 hover:text-yellow-300"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right - Profile */}
        <div className="flex items-center">
          <Link
            href="/dashboard/profile"
            className={`p-1 rounded-full transition ${
              pathname === "/dashboard/profile"
                ? "bg-white"
                : "hover:bg-blue-500/30"
            }`}
          >
            <UserCircle
              size={32}
              className={
                pathname === "/dashboard/profile"
                  ? "text-blue-700"
                  : "text-white"
              }
            />
          </Link>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden bg-blue-700 px-4 py-2 flex overflow-x-auto space-x-4 text-sm text-white">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap px-3 py-1 rounded-lg transition ${
              pathname === href
                ? "bg-white text-blue-700 shadow"
                : "hover:bg-blue-500/40 hover:text-yellow-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
