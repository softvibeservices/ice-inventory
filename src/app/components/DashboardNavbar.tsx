// src/app/components/DashboardNavbar.tsx
// ✅ FIXED VERSION: Always uses userId from localStorage

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
} from "lucide-react";

export default function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [pendingCount, setPendingCount] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // ✅ ADDED
  const [showDialog, setShowDialog] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ================= LOAD USER DATA ================= */
  // ✅ FIXED: Get userId and role from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRole(parsed.role || "admin");
        setUserId(parsed._id || null); // ✅ Extract userId
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
    ...(role === "manager"
      ? []
      : [
          { href: "/dashboard/sales", label: "Sales", icon: BarChart3 },
          { href: "/dashboard/delivery/live-map", label: "Live Map", icon: LayoutDashboard },
        ]),
  ];

  /* ================= NOTIFICATIONS ================= */
  // ✅ FIXED: Only use userId, not adminEmail
  useEffect(() => {
    if (!userId || role === "manager") return; // ✅ Skip if no userId or if manager

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/delivery/notifications?userId=${userId}`);
        const data = await res.json();
        
        if (typeof data?.pendingPartners === "number") {
          setPendingCount(data.pendingPartners);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();

    // ✅ Optional: Poll for updates every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId, role]);

  // ✅ FIXED: Build requests href with userId
  const requestsHref = userId
    ? `/dashboard/delivery-requests?userId=${encodeURIComponent(userId)}`
    : "/dashboard/delivery-requests";

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    localStorage.removeItem("user");
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
          <div className="ml-auto flex items-center gap-3">
            {role !== "manager" && (
              <Link href={requestsHref} className="relative">
                <Bell className="text-slate-300 hover:text-cyan-400" size={22} />
                {pendingCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-xs px-1.5 py-0.5 rounded-full">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Link>
            )}

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

              {/* Mobile Profile & Logout */}
              {role !== "manager" && (
                <>
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
                    className="flex items-center gap-3 px-4 py-3 rounded-md text-sm text-slate-300 hover:bg-white/10 transition relative"
                  >
                    <Bell size={18} />
                    Delivery Requests
                    {pendingCount > 0 && (
                      <span className="ml-auto bg-red-600 text-xs px-2 py-0.5 rounded-full">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

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
            </div>
          </div>
        )}
      </header>
    </>
  );
}