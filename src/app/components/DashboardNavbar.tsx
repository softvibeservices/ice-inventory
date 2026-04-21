// src/app/components/DashboardNavbar.tsx

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Package,
  Boxes,
  Users,
  FileText,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Bell,
  UserCircle,
  LogOut,
  Menu,
  X,
  Map,
  CreditCard,
} from "lucide-react";
import SubscriptionBadge from "./SubscriptionBadge";

export default function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [pendingCount, setPendingCount] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ================= LOAD USER DATA ================= */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRole(parsed.role || "admin");
        setUserId(parsed._id || null);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  /* ================= NAV LINKS ================= */
  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/products", label: "Products", icon: Package },
    { href: "/dashboard/stocks", label: "Stocks", icon: Boxes },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
    { href: "/dashboard/billing", label: "Billing", icon: FileText },
    { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
    { href: "/dashboard/delivery/live-map", label: "Live Map", icon: Map },
    ...(role === "manager"
      ? []
      : [
          { href: "/dashboard/sales", label: "Sales", icon: BarChart3 },
        ]),
  ];

  /* ================= NOTIFICATIONS ================= */
  useEffect(() => {
    if (!userId || role === "manager") return;

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/delivery/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (typeof data?.pendingPartners === "number") {
          setPendingCount(data.pendingPartners);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();

    // Poll for updates every 15 MINUTES
    const interval = setInterval(fetchNotifications, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, role]);

  const requestsHref = "/dashboard/delivery-requests";

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("rememberMe");
    router.push("/login");
  };

  return (
    <>
      {/* ================= LOGOUT CONFIRM ================= */}
      {showDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl bg-[#020617] border border-white/10 p-6 text-center shadow-xl">
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">
              Confirm Logout
            </h2>
            <p className="text-slate-300 mb-6">
              Are you sure you want to logout?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#020617] via-[#020b2c] to-[#031136] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">

          {/* LOGO */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Logo"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="hidden sm:block font-semibold text-white">
              IceCream Inventory
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden lg:flex items-center gap-2 ml-6">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition
                  ${
                    pathname === href
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-slate-300 hover:bg-white/10 hover:text-cyan-300"
                  }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>

          {/* RIGHT */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">

            {/* ── SUBSCRIPTION BADGE (Admin only, desktop) ── */}
            {role !== "manager" && <SubscriptionBadge />}

            {/* NOTIFICATION BELL (Admin only) */}
            {role !== "manager" && (
              <Link href={requestsHref} className="relative group">
                <div className="relative">
                  <Bell
                    className={`transition ${
                      pendingCount > 0
                        ? "text-red-400 hover:text-red-300"
                        : "text-slate-300 hover:text-cyan-400"
                    }`}
                    size={22}
                  />
                  {pendingCount > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping opacity-75"></span>
                      <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg border border-red-400">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    </>
                  )}
                </div>

                {pendingCount > 0 && (
                  <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-3 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {pendingCount} pending request{pendingCount > 1 ? "s" : ""}
                  </div>
                )}
              </Link>
            )}

            {/* PROFILE (Admin only) */}
            {role !== "manager" && (
              <Link href="/dashboard/profile">
                <UserCircle
                  size={30}
                  className={`transition ${
                    pathname === "/dashboard/profile"
                      ? "text-cyan-400"
                      : "text-slate-300 hover:text-cyan-400"
                  }`}
                />
              </Link>
            )}

            {/* LOGOUT BUTTON (Desktop - Manager only) */}
            {role === "manager" && (
              <button
                onClick={() => setShowDialog(true)}
                className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-white/10 transition"
              >
                <LogOut size={18} />
                <span className="hidden xl:inline">Logout</span>
              </button>
            )}

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={() => setMobileOpen((s) => !s)}
              className="lg:hidden text-slate-300 hover:text-cyan-400"
            >
              {mobileOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {/* ================= MOBILE MENU ================= */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#020617]">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm transition
                    ${
                      pathname === href
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}

              {/* Mobile Admin-only items */}
              {role !== "manager" && (
                <>
                  {/* ── SUBSCRIPTION LINK (mobile, admin only) ── */}
                  <Link
                    href="/dashboard/subscription"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm transition ${
                      pathname === "/dashboard/subscription"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <CreditCard size={18} />
                    Subscription
                  </Link>

                  <Link
                    href="/dashboard/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-md text-sm text-slate-300 hover:bg-white/10 transition"
                  >
                    <UserCircle size={18} />
                    Profile
                  </Link>

                  <Link
                    href={requestsHref}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm transition relative ${
                      pendingCount > 0
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <Bell size={18} />
                    <span>Delivery Requests</span>
                    {pendingCount > 0 && (
                      <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg border border-red-400">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {/* LOGOUT (Mobile - Manager only) */}
              {role === "manager" && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setShowDialog(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm text-red-400 hover:bg-white/10 transition"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}