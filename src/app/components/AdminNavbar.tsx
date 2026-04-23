
// ice-inventory\src\app\components\AdminNavbar.tsx


"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  ShieldCheck,
  LogOut,
  ExternalLink,
  ChevronRight,
  Layers,
} from "lucide-react";

const navLinks = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Subscriptions",
    href: "/admin/subscriptions",
    icon: Layers,
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    label: "Add-ons",
    href: "/admin/addons",
    icon: Package,
  },
];

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <aside className="admin-sidebar">
      {/* Logo / Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <ShieldCheck size={20} />
        </div>
        <div className="brand-text">
          <span className="brand-name">SuperAdmin</span>
          <span className="brand-badge">CONTROL PANEL</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        <p className="nav-section-label">Navigation</p>
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${active ? "nav-link-active" : ""}`}
            >
              <Icon size={17} className="nav-icon" />
              <span>{link.label}</span>
              {active && <ChevronRight size={14} className="nav-chevron" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="sidebar-footer">
        <Link href="/dashboard" className="footer-link">
          <ExternalLink size={15} />
          <span>Main Dashboard</span>
        </Link>
        <button className="footer-logout" onClick={handleLogout}>
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>

      <style jsx>{`
        .admin-sidebar {
          width: 240px;
          min-height: 100vh;
          background: #0d1117;
          border-right: 1px solid #1e2530;
          display: flex;
          flex-direction: column;
          padding: 0;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 50;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 18px;
          border-bottom: 1px solid #1e2530;
        }

        .brand-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-size: 14px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.01em;
        }

        .brand-badge {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          padding: 1px 5px;
          border-radius: 3px;
          margin-top: 1px;
          width: fit-content;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nav-section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #4b5563;
          padding: 0 8px 8px;
          text-transform: uppercase;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          text-decoration: none;
          color: #6b7280;
          font-size: 13.5px;
          font-weight: 500;
          transition: all 0.15s ease;
          position: relative;
        }

        .nav-link:hover {
          background: #1a2232;
          color: #cbd5e1;
        }

        .nav-link-active {
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
        }

        .nav-link-active:hover {
          background: rgba(59, 130, 246, 0.16);
          color: #60a5fa;
        }

        .nav-icon {
          flex-shrink: 0;
        }

        .nav-chevron {
          margin-left: auto;
          opacity: 0.5;
        }

        .sidebar-footer {
          padding: 12px 10px;
          border-top: 1px solid #1e2530;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .footer-link,
        .footer-logout {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
          width: 100%;
          border: none;
          background: transparent;
        }

        .footer-link {
          color: #6b7280;
        }

        .footer-link:hover {
          background: #1a2232;
          color: #94a3b8;
        }

        .footer-logout {
          color: #f87171;
        }

        .footer-logout:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
        }
      `}</style>
    </aside>
  );
}