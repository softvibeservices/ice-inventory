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
  ScrollText,
  ChevronDown,
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
  const [moreOpen, setMoreOpen] = useState(false);

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
  // Primary nav links shown directly in navbar (kept concise)
  const primaryLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/products", label: "Products", icon: Package },
    { href: "/dashboard/stocks", label: "Stocks", icon: Boxes },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
    { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
    { href: "/dashboard/billing", label: "Billing", icon: FileText },
  ];

  // Secondary links shown in "More" dropdown (admin only on desktop, all on mobile)
  const secondaryLinks = [
    { href: "/dashboard/delivery/live-map", label: "Live Map", icon: Map },
    ...(role !== "manager"
      ? [
          { href: "/dashboard/sales", label: "Sales", icon: BarChart3 },
          {
            href: "/dashboard/activity-logs",
            label: "Activity Logs",
            icon: ScrollText,
          },
        ]
      : []),
  ];

  // All links combined for mobile menu
  const allLinks = [...primaryLinks, ...secondaryLinks];

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

  /* ================= ACTIVE LINK CHECK ================= */
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const isSecondaryActive = secondaryLinks.some((l) => isActive(l.href));

  return (
    <>
      {/* ================= LOGOUT CONFIRM ================= */}
      {showDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-[#020617] border border-white/10 p-6 text-center shadow-2xl">
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
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center gap-3">

          {/* LOGO */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Logo"
              width={34}
              height={34}
              className="rounded-lg"
            />
            <span className="hidden sm:block font-semibold text-white text-sm whitespace-nowrap">
              IceCream Inventory
            </span>
          </Link>

          {/* DESKTOP NAV — PRIMARY LINKS */}
          <nav className="hidden lg:flex items-center gap-1 ml-4 flex-1 min-w-0">
            {primaryLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition whitespace-nowrap
                  ${
                    isActive(href)
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-slate-300 hover:bg-white/10 hover:text-cyan-300"
                  }`}
              >
                <Icon size={15} />
                <span className="hidden xl:inline">{label}</span>
              </Link>
            ))}

            {/* MORE DROPDOWN (secondary links) */}
            {secondaryLinks.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition whitespace-nowrap
                    ${
                      isSecondaryActive
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-slate-300 hover:bg-white/10 hover:text-cyan-300"
                    }`}
                >
                  <span className="hidden xl:inline">More</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {moreOpen && (
                  <div className="absolute left-0 top-full mt-1 w-44 bg-[#0a1628] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                    {secondaryLinks.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition
                          ${
                            isActive(href)
                              ? "bg-cyan-500/20 text-cyan-400"
                              : "text-slate-300 hover:bg-white/10 hover:text-cyan-300"
                          }`}
                      >
                        <Icon size={15} />
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* RIGHT SIDE ACTIONS */}
          <div className="ml-auto flex items-center gap-2">

            {/* SUBSCRIPTION BADGE (Admin only) */}
            {role !== "manager" && (
              <div className="hidden sm:block">
                <SubscriptionBadge />
              </div>
            )}

            {/* NOTIFICATION BELL (Admin only) */}
            {role !== "manager" && (
              <Link href={requestsHref} className="relative group p-1">
                <div className="relative">
                  <Bell
                    className={`transition ${
                      pendingCount > 0
                        ? "text-red-400 hover:text-red-300"
                        : "text-slate-300 hover:text-cyan-400"
                    }`}
                    size={20}
                  />
                  {pendingCount > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                      <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center shadow-lg border border-red-400 leading-none">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    </>
                  )}
                </div>
                {pendingCount > 0 && (
                  <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {pendingCount} pending request{pendingCount > 1 ? "s" : ""}
                  </div>
                )}
              </Link>
            )}

            {/* PROFILE (Admin only) */}
            {role !== "manager" && (
              <Link href="/dashboard/profile" className="p-1">
                <UserCircle
                  size={28}
                  className={`transition ${
                    pathname === "/dashboard/profile"
                      ? "text-cyan-400"
                      : "text-slate-300 hover:text-cyan-400"
                  }`}
                />
              </Link>
            )}

            {/* LOGOUT (Manager — desktop) */}
            {role === "manager" && (
              <button
                onClick={() => setShowDialog(true)}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-red-400 hover:bg-white/10 transition"
              >
                <LogOut size={16} />
                <span className="hidden xl:inline">Logout</span>
              </button>
            )}

            {/* MOBILE MENU TOGGLE */}
            <button
              onClick={() => setMobileOpen((s) => !s)}
              className="lg:hidden text-slate-300 hover:text-cyan-400 p-1"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* ================= MOBILE MENU ================= */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#020617]">
            <div className="px-4 py-3 space-y-0.5 max-h-[80vh] overflow-y-auto">
              {allLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition
                    ${
                      isActive(href)
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                >
                  <Icon size={17} />
                  {label}
                </Link>
              ))}

              {/* Mobile — Admin-only extras */}
              {role !== "manager" && (
                <>
                  <div className="my-1 border-t border-white/10" />

                  <Link
                    href="/dashboard/subscription"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition ${
                      pathname === "/dashboard/subscription"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <CreditCard size={17} />
                    Subscription
                  </Link>

                  <Link
                    href="/dashboard/profile"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition ${
                      pathname === "/dashboard/profile"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <UserCircle size={17} />
                    Profile
                  </Link>

                  <Link
                    href={requestsHref}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition relative ${
                      pendingCount > 0
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <Bell size={17} />
                    <span>Delivery Requests</span>
                    {pendingCount > 0 && (
                      <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg border border-red-400">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </Link>

                  {/* Logout for Admin on mobile */}
                  <div className="pt-1 border-t border-white/10 mt-1">
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        setShowDialog(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-red-400 hover:bg-white/10 transition"
                    >
                      <LogOut size={17} />
                      Logout
                    </button>
                  </div>
                </>
              )}

              {/* Logout for Manager on mobile */}
              {role === "manager" && (
                <div className="pt-1 border-t border-white/10 mt-1">
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setShowDialog(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-red-400 hover:bg-white/10 transition"
                  >
                    <LogOut size={17} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}