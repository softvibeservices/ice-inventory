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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import SubscriptionBadge from "./SubscriptionBadge";

// ── Sub-link data (Phase 2 subsidebar) ────────────────────────────────────────
const stocksSubLinks = [
  { href: "/dashboard/stocks", label: "Overview" },
  { href: "/dashboard/stocks/restock", label: "Restock" },
  { href: "/dashboard/stocks/history", label: "History" },
];



export default function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [pendingCount, setPendingCount] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sidebar collapse state — persisted to localStorage
  const [collapsed, setCollapsed] = useState(false);

  // Subsidebar expand state — stocks only now
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.startsWith("/dashboard/stocks")) return "stocks";
    }
    return null;
  });

  // Load collapse preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebarCollapsed");
      if (stored !== null) setCollapsed(stored === "true");
    } catch {
      // ignore
    }
  }, []);

  // Persist collapse preference
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebarCollapsed", String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // FIX: Keep --sidebar-current-w on :root in sync with collapse state so that
  // .dash-topbar and .dash-content-offset always have the correct left/margin-left.
  // CSS sibling selectors (.dash-sidebar-collapsed ~ .dash-topbar) cannot reach
  // across Next.js layout subtree boundaries, so we drive it from JS instead.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-current-w",
      collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w-expanded)"
    );
  }, [collapsed]);

  // Auto-expand group based on current pathname
  useEffect(() => {
    if (pathname.startsWith("/dashboard/stocks")) setExpandedGroup("stocks");
  }, [pathname]);

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
  // Split into three sections for labeled grouping:
  //   MAIN       — Dashboard, Products
  //   INVENTORY  — Stocks, Customers
  //   OPERATIONS — Billing, Orders, Live Map, Sales
  const mainLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/products", label: "Products", icon: Package },
  ];

  const inventoryLinks = [
    { href: "/dashboard/stocks",    label: "Stocks",    icon: Boxes },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
  ];

  const operationsLinks = [
    { href: "/dashboard/billing",          label: "Billing",  icon: FileText },
    { href: "/dashboard/orders",           label: "Orders",   icon: ClipboardList },
    { href: "/dashboard/delivery/live-map",label: "Live Map", icon: Map },
    ...(role === "manager"
      ? []
      : [{ href: "/dashboard/sales", label: "Sales", icon: BarChart3 }]),
  ];

  // Flat list kept for backwards-compat (notifications etc.)
  const navLinks = [...mainLinks, ...inventoryLinks, ...operationsLinks];

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
      {/* ================= LOGOUT CONFIRM DIALOG ================= */}
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

      {/* ===============================================================
          TOP NAVBAR — visible on ALL breakpoints (mobile + desktop).

          Mobile  (<1024px): sticky, full-width strip with hamburger +
                             logo + bell + profile.
          Desktop (≥1024px): fixed strip positioned to the RIGHT of the
                             sidebar, showing only bell + profile
                             (hamburger and logo are lg:hidden inside).
          =============================================================== */}
      <div className="dash-topbar">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMobileOpen((s) => !s)}
          className="text-slate-300 hover:text-cyan-400 transition flex-shrink-0 lg:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo — mobile only */}
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <Image src="/logo.png" alt="Logo" width={28} height={28} className="rounded-md" />
          <span className="font-semibold text-white text-sm">Ice Inventory</span>
        </Link>

        {/* Right cluster — always visible on all breakpoints */}
        <div className="ml-auto flex items-center gap-3">
          {/* Subscription badge — admin only, hidden on very small screens */}
          {role !== "manager" && (
            <div className="hidden md:block">
              <SubscriptionBadge />
            </div>
          )}

          {/* Delivery notification bell — admin only */}
          {role !== "manager" && (
            <Link
              href={requestsHref}
              className="relative"
              onClick={() => setMobileOpen(false)}
              aria-label="Delivery requests"
            >
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
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full animate-ping opacity-75 pointer-events-none"></span>
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-lg border border-red-400 pointer-events-none">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                </>
              )}
            </Link>
          )}

          {/* Profile icon — links to profile page (admin only) */}
          {role !== "manager" && (
            <Link
              href="/dashboard/profile"
              onClick={() => setMobileOpen(false)}
              aria-label="Profile"
            >
              <UserCircle
                size={26}
                className={`transition ${
                  pathname.startsWith("/dashboard/profile")
                    ? "text-cyan-400"
                    : "text-slate-300 hover:text-cyan-400"
                }`}
              />
            </Link>
          )}
        </div>
      </div>

      {/* ================= MOBILE DRAWER BACKDROP ================= */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`dash-sidebar${collapsed ? " dash-sidebar-collapsed" : ""}${mobileOpen ? " dash-sidebar-open" : ""}`}
      >
        {/* ── Sidebar Header ── */}
        <div className="dash-sidebar-header">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 min-w-0"
            onClick={() => setMobileOpen(false)}
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="rounded-md flex-shrink-0"
            />
            {!collapsed && (
              <span className="font-semibold text-white text-sm truncate">
                Ice Inventory
              </span>
            )}
          </Link>
          <button
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition flex-shrink-0"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* ── Main Nav ── */}
        <nav className="dash-sidebar-nav">

          {/* ─── MAIN section ─── */}
          {!collapsed && <span className="dash-section-label">Main</span>}
          {mainLinks.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/dashboard"
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`dash-nav-link${isActive ? " dash-nav-link-active" : ""}`}
                style={{ justifyContent: collapsed ? "center" : undefined }}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
                {collapsed && <span className="dash-tooltip">{label}</span>}
              </Link>
            );
          })}

          {/* ─── INVENTORY section ─── */}
          {!collapsed && <span className="dash-section-label">Inventory</span>}
          {inventoryLinks.map(({ href, label, icon: Icon }) => {
            // Stocks gets the subsidebar treatment
            if (href === "/dashboard/stocks") {
              const isExpanded = expandedGroup === "stocks";
              const isActive = pathname.startsWith("/dashboard/stocks");
              return (
                <div key={href}>
                  <button
                    onClick={() => {
                      if (collapsed) {
                        router.push(href);
                      } else {
                        setExpandedGroup(isExpanded ? null : "stocks");
                      }
                    }}
                    className={`dash-nav-link w-full${isActive ? " dash-nav-link-active" : ""}`}
                    style={{ justifyContent: collapsed ? "center" : "space-between" }}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={18} className="flex-shrink-0" />
                      {!collapsed && <span>{label}</span>}
                    </span>
                    {!collapsed && (
                      <ChevronDown
                        size={14}
                        className="flex-shrink-0 transition-transform duration-150"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    )}
                    {collapsed && <span className="dash-tooltip">{label}</span>}
                  </button>

                  {!collapsed && isExpanded && (
                    <div className="dash-subsidebar">
                      {stocksSubLinks.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className={`dash-subnav-link${pathname === sub.href ? " dash-subnav-link-active" : ""}`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            // Other inventory links (Customers)
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`dash-nav-link${isActive ? " dash-nav-link-active" : ""}`}
                style={{ justifyContent: collapsed ? "center" : undefined }}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
                {collapsed && <span className="dash-tooltip">{label}</span>}
              </Link>
            );
          })}

          {/* ─── OPERATIONS section ─── */}
          {!collapsed && <span className="dash-section-label">Operations</span>}
          {operationsLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`dash-nav-link${isActive ? " dash-nav-link-active" : ""}`}
                style={{ justifyContent: collapsed ? "center" : undefined }}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
                {collapsed && <span className="dash-tooltip">{label}</span>}
              </Link>
            );
          })}

        </nav>

        {/* ── Sidebar Footer ── */}
        <div className="dash-sidebar-footer">
          {/* Subscription Badge — admin only, shown only when expanded */}
          {role !== "manager" && !collapsed && (
            <div className="px-1 pb-1">
              <SubscriptionBadge />
            </div>
          )}

          {/* Logout — ALL users (admin + manager) with confirmation dialog */}
          <button
            onClick={() => {
              setMobileOpen(false);
              setShowDialog(true);
            }}
            className="dash-nav-link dash-nav-link-danger w-full"
            style={{ justifyContent: collapsed ? "center" : undefined }}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
            {collapsed && <span className="dash-tooltip">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}