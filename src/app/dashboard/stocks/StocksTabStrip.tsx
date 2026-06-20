// src/app/dashboard/stocks/StocksTabStrip.tsx
// Shared tab navigation for the Stocks section.
// Kept as a client component because it needs usePathname.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, RefreshCw, History as HistoryIcon } from "lucide-react";

const TABS = [
  { href: "/dashboard/stocks",         label: "Overview", icon: Boxes },
  { href: "/dashboard/stocks/restock", label: "Restock",  icon: RefreshCw },
  { href: "/dashboard/stocks/history", label: "History",  icon: HistoryIcon },
] as const;

export default function StocksTabStrip() {
  const pathname = usePathname();

  const descriptions: Record<string, string> = {
    "/dashboard/stocks": "Current stock levels for every product",
    "/dashboard/stocks/restock": "Add new stock to your inventory",
    "/dashboard/stocks/history": "A record of every past stock change",
  };

  const activeDescription = descriptions[pathname] || "";

  return (
    <>
      <div className="saas-card saas-card-compact mb-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all border ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 border-blue-600"
                    : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 border-gray-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      {activeDescription && (
        <p className="tab-description">{activeDescription}</p>
      )}
    </>
  );
}
