
// src\app\dashboard\page.tsx

"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "../components/DashboardNavbar";
import Footer from "../components/Footer";
import DeliveryOverview from "./DeliveryOverview";

import type { Order, Product, Customer, StickyNote } from "./types";
import toast, { Toaster } from "react-hot-toast";
import { StickyNotesPanel } from "./sticky-notes";

export default function DashboardPage() {
  // ========= STATE =========
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

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
        const [prodRes, custRes, ordersRes] = await Promise.all([
          fetch(`/api/products?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/customers?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/orders?userId=${encodeURIComponent(userId)}`),
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
      }
    };

    setLoadingOrders(true);
    fetchMasterData();
  }, [userId]);

  // ========= RENDER =========
   return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-hidden">
      <DashboardNavbar />

      <main className="flex-grow text-gray-700 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 h-full">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start h-full">
            {/* LEFT: Delivery Overview */}
            <DeliveryOverview
              orders={orders}
              loadingOrders={loadingOrders}
            />

            {/* RIGHT: Sticky Notes Panel */}
            <StickyNotesPanel />
          </div>
        </div>
      </main>

      <Footer />
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );

}
