// src/app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

import type { Order, Product, Customer } from "./types";
import toast, { Toaster } from "react-hot-toast";
import { StickyNotesPanel } from "./sticky-notes";

type TabType =
  | "delivery"
  | "popular-products"
  | "customers"
  | "delivery-partners"
  | "sticky-notes"
  | "low-stock";

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
        const headers = { Authorization: `Bearer ${token}` };
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
      id: "popular-products" as TabType,
      label: "Popular Products",
      icon: TrendingUp,
      color: "purple",
    },
    {
      id: "customers" as TabType,
      label: "Customers",
      icon: Users,
      color: "blue",
    },
    {
      id: "delivery-partners" as TabType,
      label: "Delivery Partners",
      icon: TruckIcon,
      color: "orange",
    },
    {
      id: "low-stock" as TabType,
      label: "Low Stock Alerts",
      icon: AlertTriangle,
      color: "red",
    },
    {
      id: "sticky-notes" as TabType,
      label: "Sticky Notes",
      icon: StickyNote,
      color: "yellow",
    },
  ];

  // Count low stock items for badge
  const lowStockCount = products.filter((p) => {
    const hasMinStock = p.minStock !== undefined && p.minStock > 0;
    return hasMinStock && p.quantity < (p.minStock ?? 0);
  }).length;

  // ========= GET BUTTON CLASSES =========
  const getButtonClasses = (tabId: TabType, color: string) => {
    const isActive = activeTab === tabId;

    const colorClasses = {
      blue: isActive
        ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
        : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300",
      purple: isActive
        ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
        : "bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300",
      orange: isActive
        ? "bg-orange-600 text-white shadow-lg shadow-orange-200"
        : "bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300",
      red: isActive
        ? "bg-red-600 text-white shadow-lg shadow-red-200"
        : "bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300",
      yellow: isActive
        ? "bg-yellow-500 text-white shadow-lg shadow-yellow-200"
        : "bg-white text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300",
    };

    return `flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all border relative ${
      colorClasses[color as keyof typeof colorClasses]
    }`;
  };

  // ========= RENDER TAB CONTENT =========
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

      default:
        return null;
    }
  };

  // ========= RENDER =========
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Tab Navigation - Button Style */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const showBadge = tab.id === "low-stock" && lowStockCount > 0;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={getButtonClasses(tab.id, tab.color)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">
                      {tab.id === "delivery"
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

          {/* Tab Content */}
          <div className="min-h-[500px]">{renderTabContent()}</div>
        </div>
      </main>

      <Footer />
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}