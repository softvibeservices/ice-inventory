// src/app/dashboard/stocks/restock/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Product, RestockItem } from "@/types/stocks.types";
import RestockPdfGenerator from "./RestockPdfGenerator";
import BulkRestockModal from "./BulkRestockModal";
import RestockFormatModal from "./RestockFormatModal";
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  Search,
  X,
  Package,
  CheckSquare,
  Boxes,
  RefreshCw,
  History as HistoryIcon,
} from "lucide-react";

type SortType = "name-asc" | "name-desc" | "category-asc" | "category-desc" | "unit-asc" | "unit-desc";

export default function RestockPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortType, setSortType] = useState<SortType>("name-asc");
  const [restockValues, setRestockValues] = useState<Record<string, number>>({});
  const [globalNote, setGlobalNote] = useState("Restocking");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {}
    }
  }, []);

  const fetchProducts = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchProducts();
  }, [userId]);

  const handleQuantityChange = (id: string, value: string) => {
    const num = Number(value);
    if (isNaN(num)) return;
    setRestockValues((prev) => ({ ...prev, [id]: num }));
  };

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q)
      );
    }
    if (sortType === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortType === "name-desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortType === "category-asc" || sortType === "category-desc") {
      list.sort((a, b) => {
        const ca = (a.category || "").toLowerCase();
        const cb = (b.category || "").toLowerCase();
        const cmp = ca.localeCompare(cb);
        if (cmp !== 0) return sortType === "category-asc" ? cmp : -cmp;
        return a.name.localeCompare(b.name);
      });
    } else if (sortType === "unit-asc" || sortType === "unit-desc") {
      list.sort((a, b) => {
        const ua = (a.unit || "").toLowerCase();
        const ub = (b.unit || "").toLowerCase();
        const cmp = ua.localeCompare(ub);
        if (cmp !== 0) return sortType === "unit-asc" ? cmp : -cmp;
        return a.name.localeCompare(b.name);
      });
    }
    return list;
  }, [products, search, sortType]);

  const selectedCount = Object.values(restockValues).filter((v) => v > 0).length;
  const totalUnitsToAdd = Object.values(restockValues).reduce((s, v) => s + (v > 0 ? v : 0), 0);

  const handleSave = async () => {
    if (!userId) return;
    const updates = Object.entries(restockValues).filter(([_, qty]) => qty !== 0);
    if (updates.length === 0) {
      toast.error("Enter at least one quantity");
      return;
    }
    try {
      const restockedItems: RestockItem[] = [];
      for (const [id, qty] of updates) {
        const product = products.find((p) => p._id === id);
        if (!product) continue;
        const newQty = product.quantity + qty;
        const token = localStorage.getItem("token");
        await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id, quantity: newQty }),
        });
        restockedItems.push({
          productId: { _id: product._id, name: product.name, category: product.category, unit: product.unit },
          quantity: qty,
          note: globalNote || "Restocking",
        });
      }
      const token = localStorage.getItem("token");
      await fetch("/api/restockHistory", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: restockedItems }),
      });
      toast.success("Stock updated & history saved!");
      setRestockValues({});
      setGlobalNote("Restocking");
      fetchProducts();
      router.push("/dashboard/stocks");
    } catch {
      toast.error("Failed to update stock");
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 dash-content-offset">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-600 font-medium">Please log in to restock products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dash-content-offset">
      <DashboardNavbar />

      <main className="flex-grow container mx-auto px-4 py-6 max-w-7xl">

        {/* ── Stocks Tab Strip (Phase 3) ── */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/dashboard/stocks", label: "Overview", icon: Boxes },
              { href: "/dashboard/stocks/restock", label: "Restock", icon: RefreshCw },
              { href: "/dashboard/stocks/history", label: "History", icon: HistoryIcon },
            ].map(({ href, label, icon: Icon }) => {
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

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/stocks")}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Restock Products</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {products.length} products available
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFormatModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              Format Guide
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Bulk Upload
            </button>
          </div>
        </div>

        {/* ── Restock Note ── */}
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Restock Reason / Note
          </label>
          <input
            type="text"
            value={globalNote}
            onChange={(e) => setGlobalNote(e.target.value)}
            placeholder="e.g., Weekly Monday Restock"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>

        {/* ── Search + Sort ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or category…"
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="sm:w-44 px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition"
          >
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="category-asc">Category (A–Z)</option>
            <option value="category-desc">Category (Z–A)</option>
            <option value="unit-asc">Unit (A–Z)</option>
            <option value="unit-desc">Unit (Z–A)</option>
          </select>
        </div>

        {/* ── Selected summary pill ── */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 font-medium">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <span>{selectedCount} product{selectedCount !== 1 ? "s" : ""} selected · {totalUnitsToAdd} total units to add</span>
            <button
              onClick={() => setRestockValues({})}
              className="ml-auto text-blue-500 hover:text-blue-800 text-xs font-semibold"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Mobile Cards ── */}
        {loading ? (
          <div className="space-y-3 sm:hidden">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center py-12 bg-white border border-gray-200 rounded-xl text-center">
                <Package className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-500 font-medium text-sm">No products found</p>
              </div>
            ) : filteredProducts.map((p) => {
              const val = restockValues[p._id];
              const hasValue = val !== undefined && val > 0;
              return (
                <div
                  key={p._id}
                  className={`rounded-xl border p-4 bg-white shadow-sm transition-all ${
                    hasValue ? "border-emerald-400 ring-1 ring-emerald-300" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
                      <p className="text-xs text-gray-500">{p.category || "Uncategorized"}</p>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      Stock: {p.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={restockValues[p._id] ?? ""}
                      onChange={(e) => handleQuantityChange(p._id, e.target.value)}
                      placeholder="Add qty…"
                      min="0"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50 transition"
                    />
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-lg">
                      {p.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Desktop Table ── */}
        <div className="hidden sm:block bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Product</th>
                <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Category</th>
                <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Current Stock</th>
                <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Add Quantity</th>
                <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-5 py-4">
                      <div className="h-5 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No products found</p>
                  </td>
                </tr>
              ) : filteredProducts.map((p) => {
                const val = restockValues[p._id];
                const hasValue = val !== undefined && val > 0;
                return (
                  <tr
                    key={p._id}
                    className={`transition-colors hover:bg-gray-50 ${hasValue ? "bg-emerald-50/50" : ""}`}
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{p.category || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-700 font-medium">{p.quantity}</td>
                    <td className="px-5 py-3.5">
                      <input
                        type="number"
                        value={restockValues[p._id] ?? ""}
                        onChange={(e) => handleQuantityChange(p._id, e.target.value)}
                        placeholder="0"
                        min="0"
                        className={`w-28 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          hasValue
                            ? "border-emerald-400 bg-emerald-50 text-emerald-800 focus:ring-emerald-300"
                            : "border-gray-200 bg-gray-50 text-gray-900 focus:ring-blue-300"
                        }`}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{p.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Action Bar ── */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-5 bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
          <div className="text-sm text-gray-500">
            {selectedCount > 0 ? (
              <span className="text-emerald-700 font-semibold">
                ✓ {selectedCount} product{selectedCount !== 1 ? "s" : ""} ready to restock
              </span>
            ) : (
              <span>Enter quantities above to begin restocking</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <RestockPdfGenerator
              items={Object.entries(restockValues)
                .filter(([_, qty]) => qty !== 0)
                .map(([id, qty]) => {
                  const product = products.find((p) => p._id === id);
                  return {
                    productId: { _id: id, name: product?.name || "", category: product?.category, unit: product?.unit || "" },
                    quantity: qty,
                    note: globalNote,
                  };
                })}
              dateTime={new Date().toLocaleString()}
              note={globalNote}
              fileName={`RESTOCK-${new Date().toISOString().slice(0, 10)}.pdf`}
            />
            <button
              onClick={handleSave}
              disabled={selectedCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save Restock
            </button>
          </div>
        </div>
      </main>

      <Footer />

      {showBulkModal && (
        <BulkRestockModal
          userId={userId}
          products={products}
          globalNote={globalNote}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => { fetchProducts(); setShowBulkModal(false); }}
        />
      )}

      {showFormatModal && <RestockFormatModal onClose={() => setShowFormatModal(false)} />}
    </div>
  );
}