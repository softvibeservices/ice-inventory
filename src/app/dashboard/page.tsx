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
  Bike,
  Activity,
  ShoppingBag,
  Package,
  DollarSign,
} from "lucide-react";

import type { Order, Product, Customer } from "./types";
import toast, { Toaster } from "react-hot-toast";
import { StickyNotesPanel } from "./sticky-notes";
import ActivityLogPanel from "./ActivityLog";
import { useSubscription } from "@/hooks/useSubscription";

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

// ── Metric stat card for summary row ──────────────────────────────────────────
function MetricCard({
  icon,
  iconColorClass,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  iconColorClass: string;
  label: string;
  value: string | number;
  loading?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon-wrap ${iconColorClass}`}>{icon}</div>
      <div>
        <p className="stat-label">{label}</p>
        {loading ? (
          <div className="skeleton h-5 w-12 mt-1" />
        ) : (
          <p className="stat-value">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("delivery");
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const { subscription } = useSubscription();

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
      const msg =
        err instanceof Error ? err.message : "Failed to load dashboard data";
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

  const tabs = [
    {
      id: "delivery" as TabType,
      label: "Delivery",
      fullLabel: "Delivery Overview",
      description: "Today's orders and their delivery status",
      icon: Truck,
      color: "blue",
    },
    {
      id: "sticky-notes" as TabType,
      label: "Notes",
      fullLabel: "Sticky Notes",
      description: "Personal scratchpad for quick reminders",
      icon: StickyNote,
      color: "amber",
    },
    {
      id: "low-stock" as TabType,
      label: "Stock",
      fullLabel: "Low Stock Alerts",
      description: "Alerts for products below minimum threshold",
      icon: AlertTriangle,
      color: "red",
    },
    {
      id: "popular-products" as TabType,
      label: "Popular",
      fullLabel: "Popular Products",
      description: "Top products sold by volume",
      icon: TrendingUp,
      color: "emerald",
    },
    {
      id: "customers" as TabType,
      label: "Customers",
      fullLabel: "Customers",
      description: "Customer directory and overview statistics",
      icon: Users,
      color: "violet",
    },
    {
      id: "delivery-partners" as TabType,
      label: "Partners",
      fullLabel: "Delivery Partners",
      description: "Active delivery team tracking",
      icon: Bike,
      color: "cyan",
    },
    {
      id: "activity-log" as TabType,
      label: "Activity",
      fullLabel: "Activity Log",
      description: "Recent system activities and logs",
      icon: Activity,
      color: "slate",
    },
  ];

  const lowStockCount = products.filter((p) => {
    const hasMinStock = p.minStock !== undefined && p.minStock > 0;
    return hasMinStock && p.quantity < (p.minStock ?? 0);
  }).length;

  const activeOrders = orders.filter((o) => !o.discardedAt);
  const pendingOrders = activeOrders.filter(
    (o) =>
      o.status === "Unsettled" &&
      (o.deliveryStatus === "Pending" || o.deliveryStatus === "On the Way")
  ).length;

  const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const renderTabContent = () => {
    switch (activeTab) {
      case "delivery":
        return <DeliveryOverview orders={orders} loadingOrders={loadingOrders} />;
      case "popular-products":
        return <MostPopularProducts />;
      case "customers":
        return <CustomerOverview />;
      case "delivery-partners":
        return <DeliveryPartnerOverview />;
      case "low-stock":
        return <LowStockAlerts products={products} loading={loadingProducts} />;
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

  // Find the active tab config
  const activeTabConfig = tabs.find((t) => t.id === activeTab);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dash-content-offset">
      <DashboardNavbar />

      <main className="flex-grow">
        <div className="page-wrapper">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <div className="page-header mb-5">
            <div className="page-header-left">
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">
                Overview of your business operations at a glance
              </p>
            </div>
          </div>

          {/* ── Summary Metrics Row ──────────────────────────────────────── */}
          <div className="stats-grid mb-6">
            <MetricCard
              icon={<ShoppingBag size={18} />}
              iconColorClass="stat-icon-blue"
              label="Total Orders"
              value={loadingOrders ? "—" : activeOrders.length.toLocaleString("en-IN")}
              loading={loadingOrders}
            />
            <MetricCard
              icon={<Package size={18} />}
              iconColorClass="stat-icon-amber"
              label="Pending Delivery"
              value={loadingOrders ? "—" : pendingOrders}
              loading={loadingOrders}
            />
            <MetricCard
              icon={<AlertTriangle size={18} />}
              iconColorClass="stat-icon-red"
              label="Low Stock Items"
              value={loadingProducts ? "—" : lowStockCount}
              loading={loadingProducts}
            />
            <MetricCard
              icon={<DollarSign size={18} />}
              iconColorClass="stat-icon-green"
              label="Total Revenue"
              value={
                loadingOrders
                  ? "—"
                  : new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(totalRevenue)
              }
              loading={loadingOrders}
            />
          </div>

          {/* ── Tab Navigation ───────────────────────────────────────────── */}
          <div className="saas-card mb-4" style={{ padding: "6px 8px" }}>
            <div className="flex items-center gap-1 overflow-x-auto dash-tab-strip">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const showBadge = tab.id === "low-stock" && lowStockCount > 0;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`dash-tab-btn${isActive ? " dash-tab-btn-active" : ""}`}
                    data-color={tab.color}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {/* Full label on md+, short label on sm, icon-only on xs */}
                    <span className="hidden md:inline whitespace-nowrap">{tab.fullLabel}</span>
                    <span className="hidden sm:inline md:hidden whitespace-nowrap">{tab.label}</span>

                    {showBadge && (
                      <span className="dash-tab-badge">
                        {lowStockCount > 99 ? "99+" : lowStockCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Active Tab Context Line ──────────────────────────────────── */}
          {activeTabConfig && (
            <div className="flex items-center gap-2 mb-4">
              <div className="dash-tab-context-dot" />
              <p className="tab-description" style={{ margin: 0 }}>
                {activeTabConfig.description}
              </p>
            </div>
          )}

          {/* ── Tab Content ──────────────────────────────────────────────── */}
          <div className="min-h-[500px] animate-fadeIn" key={activeTab}>
            {renderTabContent()}
          </div>
        </div>
      </main>

      <Footer />
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          style: {
            fontFamily: "'Inter', Arial, sans-serif",
            fontSize: "13px",
            borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          },
        }}
      />
    </div>
  );
}