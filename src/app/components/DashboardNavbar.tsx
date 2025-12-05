// src/app/components/DashboardNavbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Package,
  Boxes,
  UserCircle,
  Users,
  FileText,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Bell,
} from "lucide-react";

export default function DashboardNavbar({ userId }: { userId?: string }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/products", label: "Products", icon: Package },
    { href: "/dashboard/stocks", label: "Stocks", icon: Boxes },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
    { href: "/dashboard/billing", label: "Billing", icon: FileText },
    { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
    { href: "/dashboard/sales", label: "Sales", icon: BarChart3 },
  ];

  // Discover admin email
  useEffect(() => {
    try {
      // @ts-ignore
      const nextData = (window as any).__NEXT_DATA__;
      const props = nextData?.props?.pageProps ?? nextData?.props?.initialProps;
      const maybeUser = props?.user ?? props?.currentUser ?? props?.session?.user;
      if (maybeUser?.email) {
        setAdminEmail(String(maybeUser.email).toLowerCase());
        return;
      }
    } catch (e) {}

    (async () => {
      try {
        const r = await fetch("/api/auth/session");
        if (!r.ok) return;
        const j = await r.json();
        const maybeUser = j?.user ?? j;
        if (maybeUser?.email) setAdminEmail(String(maybeUser.email).toLowerCase());
      } catch (e) {}
    })();

    const fallback = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (fallback && !adminEmail) {
      setAdminEmail(String(fallback).toLowerCase());
    }
  }, []);

  // Fetch pending delivery requests count
  useEffect(() => {
    const q = new URLSearchParams();
    if (userId) q.set("userId", userId);
    else if (adminEmail) q.set("adminEmail", adminEmail);
    else return;

    fetch(`/api/delivery/notifications?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.pendingPartners === "number") {
          setPendingCount(d.pendingPartners || 0);
        }
      })
      .catch(() => {});
  }, [userId, adminEmail]);

  const requestsHref = adminEmail
    ? `/dashboard/delivery-requests?adminEmail=${encodeURIComponent(adminEmail)}`
    : `/dashboard/delivery-requests`;

  return (
    <header className="bg-blue-600 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition">
          <Image
            src="/logo.png"
            alt="Logo"
            width={36}
            height={36}
            className="rounded-full border border-white shadow"
            priority
          />
          <span className="font-semibold text-lg text-white">IceCream Inventory</span>
        </Link>

        {/* Desktop NAV */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-white text-[0.92rem] ml-4">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition ${
                pathname === href
                  ? "bg-white text-blue-700 shadow"
                  : "hover:bg-blue-500/30 hover:text-yellow-300"
              }`}
            >
              <Icon size={17} />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Right side: Notifications + Profile */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Notification Bell */}
          <Link href={requestsHref} className="relative" title="Delivery requests">
            <Bell size={22} className="text-white" />

            {/* 🔴 RED BADGE FOR PENDING REQUESTS */}
            {pendingCount > 0 && (
              <span className="
                absolute -top-2 -right-2
                bg-red-600 text-white text-xs
                rounded-full px-1.5 py-0.5
              ">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </Link>

          {/* Profile Icon */}
          <Link
            href="/dashboard/profile"
            className={`p-1.5 rounded-full transition ${
              pathname === "/dashboard/profile" ? "bg-white" : "hover:bg-blue-500/30"
            }`}
          >
            <UserCircle
              size={32}
              className={pathname === "/dashboard/profile" ? "text-blue-700" : "text-white"}
            />
          </Link>
        </div>
      </div>

      {/* Mobile NAV */}
      <div className="md:hidden bg-blue-700 px-3 py-2 flex overflow-x-auto gap-4 text-sm text-white no-scrollbar">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap px-4 py-1.5 rounded-md transition ${
              pathname === href ? "bg-white text-blue-700" : "hover:bg-blue-500/40 hover:text-yellow-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </header>
  );
}
