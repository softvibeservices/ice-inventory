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
} from "lucide-react";

export default function DashboardNavbar({ userId }: { userId?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const [pendingCount, setPendingCount] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ================= LOAD ROLE ================= */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRole(parsed.role);
      }
    } catch {}
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

  /* ================= ADMIN EMAIL ================= */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email) setAdminEmail(parsed.email.toLowerCase());
      }
    } catch {}
  }, []);

  /* ================= NOTIFICATIONS ================= */
  useEffect(() => {
    if (!adminEmail && !userId) return;

    const q = new URLSearchParams();
    if (userId) q.set("userId", userId);
    else if (adminEmail) q.set("adminEmail", adminEmail);

    fetch(`/api/delivery/notifications?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.pendingPartners === "number") {
          setPendingCount(d.pendingPartners);
        }
      })
      .catch(() => {});
  }, [adminEmail, userId]);

  const requestsHref = adminEmail
    ? `/dashboard/delivery-requests?adminEmail=${encodeURIComponent(adminEmail)}`
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
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm transition
                    ${
                      pathname === href
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                >
                  {label}
                </Link>
              ))}

              {role === "manager" && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setShowDialog(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10"
                >
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
