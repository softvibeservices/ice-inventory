// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardNavbar from "../components/DashboardNavbar";
import Footer from "../components/Footer";
import DeliveryOverview from "./DeliveryOverview";
import LowStockAlerts from "./LowStockAlerts";
import MostPopularProducts from "./MostPopularProducts";
import CustomerOverview from "./CustomerOverview";
import DeliveryPartnerOverview from "./DeliveryPartnerOverview";

import {
  Truck,
  StickyNote,
  AlertTriangle,
  TrendingUp,
  Users,
  TruckIcon,
  Activity,
  Boxes
} from "lucide-react";

import type { Order, Product, Customer } from "./types";
import toast, { Toaster } from "react-hot-toast";
import { StickyNotesPanel } from "./sticky-notes";
import ActivityLogPanel from "./ActivityLog";
import { useSubscription } from "@/hooks/useSubscription";

// FIX 1: Added "activity-log" to TabType union
type TabType =
  | "activity-log"
  | "delivery"
  | "popular-products"
  | "customers"
  | "delivery-partners"
  | "sticky-notes"
  | "low-stock";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DashboardPage() {
  // ========= STATE =========
  const [activeTab, setActiveTab] = useState<TabType>("delivery");
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ── PHASE 8: Subscription data for limit warnings ─────────────────────────
  const { subscription } = useSubscription();
  // ─────────────────────────────────────────────────────────────────────────

  // ========= INIT USER =========
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {
        // ignore
      }
    }
  }, []);

  // ========= FETCH DATA =========
  const fetchMasterData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingOrders(true);
      setLoadingProducts(true);

      const headers = getAuthHeaders();

      const [prodRes, custRes, ordersRes] = await Promise.all([
        fetch(`/api/products`, { headers }),
        fetch(`/api/customers`, { headers }),
        fetch(`/api/orders`, { headers }),
      ]);

      if (!prodRes.ok) throw new Error("Products fetch failed");
      if (!custRes.ok) throw new Error("Customers fetch failed");
      if (!ordersRes.ok) throw new Error("Orders fetch failed");

      const prodData = await prodRes.json();
      const custData = await custRes.json();
      const ordersData = await ordersRes.json();

      setProducts(Array.isArray(prodData) ? prodData : []);
      setCustomers(Array.isArray(custData) ? custData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard data";
      console.error(err);
      toast.error(msg);
    } finally {
      setLoadingOrders(false);
      setLoadingProducts(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // ========= TAB CONFIGURATION =========
  const tabs = [
    {
      id: "delivery" as TabType,
      label: "Delivery Overview",
      description: "Today's orders and their delivery status",
      icon: Truck,
    },
    {
      id: "sticky-notes" as TabType,
      label: "Sticky Notes",
      description: "Personal scratchpad for quick reminders",
      icon: StickyNote,
    },
    {
      id: "low-stock" as TabType,
      label: "Low Stock Alerts",
      description: "Alerts for products below minimum threshold",
      icon: AlertTriangle,
    },
    {
      id: "popular-products" as TabType,
      label: "Popular Products",
      description: "Top products sold by volume",
      icon: TrendingUp,
    },
    {
      id: "customers" as TabType,
      label: "Customers",
      description: "Customer directory and overview statistics",
      icon: Users,
    },
    {
      id: "delivery-partners" as TabType,
      label: "Delivery Partners",
      description: "Active delivery team tracking",
      icon: TruckIcon,
    },
    {
      id: "activity-log" as TabType,
      label: "Activity Log",
      description: "Recent system activities and logs",
      icon: Activity,
    },
  ];

  // Count low stock items for badge
  const lowStockCount = products.filter((p) => {
    const hasMinStock = p.minStock !== undefined && p.minStock > 0;
    return hasMinStock && p.quantity < (p.minStock ?? 0);
  }).length;

  // ========= GET BUTTON CLASSES =========
  const getButtonClasses = (tabId: TabType) => {
    const isActive = activeTab === tabId;

    return `flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all border relative ${
      isActive
        ? "bg-blue-600 text-white shadow-md shadow-blue-100 border-blue-600"
        : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-slate-200"
    }`;
  };

  // ========= RENDER TAB CONTENT =========
  const renderTabContent = () => {
    switch (activeTab) {
      case "delivery":
        return (
          <DeliveryOverview
            orders={orders}
            loadingOrders={loadingOrders}
          />
        );

      case "popular-products":
        return <MostPopularProducts />;

      case "customers":
        return <CustomerOverview />;

      case "delivery-partners":
        return <DeliveryPartnerOverview />;

      case "low-stock":
        return (
          <LowStockAlerts products={products} loading={loadingProducts} />
        );

      case "sticky-notes":
        return (
          <div className="w-full">
            <StickyNotesPanel />
          </div>
        );
      case "activity-log":
        return <ActivityLogPanel />;

      default:
        return null;
    }
  };

  // ========= DERIVE LIMIT WARNING DATA ─────────────────────────────────────
  //  Compute the values PlanLimitWarning needs from the live subscription data.
  //  Using server-side counts (subscription.usage) keeps these accurate.
  //  ✅ FIXED: Added proper null/undefined checks for subscription.usage
  const invoicesUsed = subscription && subscription.usage
    ? (subscription.planId === "free_trial"
      ? subscription.usage.invoicesUsedTotal
      : subscription.usage.invoicesUsedThisMonth)
    : null;

  const invoicesLimit = subscription && subscription.effectiveLimits
    ? (subscription.planId === "free_trial"
      ? subscription.effectiveLimits.invoicesTotal
      : subscription.effectiveLimits.invoicesPerMonth)
    : null;
  // ─────────────────────────────────────────────────────────────────────────

  // ========= RENDER =========
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dash-content-offset">
      <DashboardNavbar />

      <main className="flex-grow">
        <div className="page-wrapper">







          {/* Tab Navigation */}
          <div className="saas-card saas-card-compact mb-6">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const showBadge =
                  tab.id === "low-stock" && lowStockCount > 0;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={getButtonClasses(tab.id)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>

                    {/* FIX 2: Added "activity-log" case to the mobile label switch */}
                    <span className="sm:hidden">
                      {tab.id === "activity-log"
                        ? "Activity"
                        : tab.id === "delivery"
                          ? "Delivery"
                          : tab.id === "popular-products"
                            ? "Popular"
                            : tab.id === "customers"
                              ? "Customers"
                              : tab.id === "delivery-partners"
                                ? "Partners"
                                : tab.id === "low-stock"
                                  ? "Stock"
                                  : "Notes"}
                    </span>

                    {/* Badge for low stock count */}
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shadow-md">
                        {lowStockCount > 99 ? "99+" : lowStockCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Tab Description Line */}
          {activeTab && (
            <p className="tab-description">
              {tabs.find((t) => t.id === activeTab)?.description || ""}
            </p>
          )}

          {/* Tab Content */}
          <div className="min-h-[500px]">{renderTabContent()}</div>
        </div>
      </main>

      <Footer />
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}