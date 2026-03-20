// src/app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "../components/DashboardNavbar";
import Footer from "../components/Footer";
import DeliveryOverview from "./DeliveryOverview";
import LowStockAlerts from "./LowStockAlerts";
import { Truck, StickyNote, AlertTriangle } from "lucide-react";

import type { Order, Product, Customer } from "./types";
import toast, { Toaster } from "react-hot-toast";
import { StickyNotesPanel } from "./sticky-notes";

type TabType = "delivery" | "sticky-notes" | "low-stock";

export default function DashboardPage() {
  // ========= STATE =========
  const [activeTab, setActiveTab] = useState<TabType>("delivery");
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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
  useEffect(() => {
    if (!userId) return;

    const fetchMasterData = async () => {
      try {
        setLoadingOrders(true);
        setLoadingProducts(true);

        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };
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
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to load dashboard data");
      } finally {
        setLoadingOrders(false);
        setLoadingProducts(false);
      }
    };

    fetchMasterData();
  }, [userId]);

  // ========= TAB CONFIGURATION =========
  const tabs = [
    {
      id: "delivery" as TabType,
      label: "Delivery Overview",
      icon: Truck,
      color: "blue",
    },
    {
      id: "sticky-notes" as TabType,
      label: "Sticky Notes",
      icon: StickyNote,
      color: "amber",
    },
    {
      id: "low-stock" as TabType,
      label: "Low Stock Alerts",
      icon: AlertTriangle,
      color: "red",
    },
  ];

  // Count low stock items for badge - ✅ FIXED LINE 104
  const lowStockCount = products.filter((p) => {
    const hasMinStock = p.minStock !== undefined && p.minStock > 0;
    return hasMinStock && p.quantity < (p.minStock ?? 0);
  }).length;

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

      case "sticky-notes":
        return (
          <div className="w-full">
            <StickyNotesPanel />
          </div>
        );

      case "low-stock":
        return (
          <LowStockAlerts
            products={products}
            loading={loadingProducts}
          />
        );

      default:
        return null;
    }
  };

  // ========= RENDER =========
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <DashboardNavbar />

      <main className="flex-grow text-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">

          {/* Tabs Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex flex-wrap gap-2 sm:gap-4" aria-label="Tabs">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  const showBadge = tab.id === "low-stock" && lowStockCount > 0;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        group inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b-2 font-medium text-xs sm:text-sm
                        transition-colors duration-200 relative
                        ${isActive
                          ? `border-${tab.color}-500 text-${tab.color}-600`
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }
                      `}
                      style={
                        isActive
                          ? {
                            borderBottomColor:
                              tab.color === "blue"
                                ? "#3b82f6"
                                : tab.color === "amber"
                                  ? "#f59e0b"
                                  : "#ef4444",
                            color:
                              tab.color === "blue"
                                ? "#2563eb"
                                : tab.color === "amber"
                                  ? "#d97706"
                                  : "#dc2626",
                          }
                          : undefined
                      }
                    >
                      <Icon
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive
                            ? ""
                            : "text-gray-400 group-hover:text-gray-500"
                          }`}
                      />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">
                        {tab.id === "delivery"
                          ? "Delivery"
                          : tab.id === "sticky-notes"
                            ? "Notes"
                            : "Alerts"}
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
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {renderTabContent()}
          </div>
        </div>
      </main>

      <Footer />
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}