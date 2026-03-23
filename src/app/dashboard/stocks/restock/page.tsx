// src/app/dashboard/stocks/restock/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Product, RestockItem } from "@/types/stocks.types";
import RestockPdfGenerator from "./RestockPdfGenerator";
import BulkRestockModal from "./BulkRestockModal";
import RestockFormatModal from "./RestockFormatModal";
import { Upload, FileSpreadsheet } from "lucide-react";

type SortType = "name-asc" | "name-desc" | "category";

export default function RestockPage() {
  const router = useRouter();
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
  headers: { "Authorization": `Bearer ${token}` },
});
      if (!res.ok) throw new Error("Failed to fetch products");
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
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }

    if (sortType === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortType === "name-desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortType === "category") {
      list.sort((a, b) => {
        const ca = (a.category || "").toLowerCase();
        const cb = (b.category || "").toLowerCase();
        if (ca === cb) return a.name.localeCompare(b.name);
        return ca.localeCompare(cb);
      });
    }

    return list;
  }, [products, search, sortType]);

  const handleSave = async () => {
    if (!userId) return;

    try {
      const updates = Object.entries(restockValues).filter(([_, qty]) => qty !== 0);

      if (updates.length === 0) {
        toast.error("Please enter at least one quantity");
        return;
      }

      const restockedItems: RestockItem[] = [];

      for (const [id, qty] of updates) {
        const product = products.find((p) => p._id === id);
        if (!product) continue;

        const newQty = product.quantity + qty;

        const token = localStorage.getItem("token");
await fetch("/api/products", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({ id, quantity: newQty }),  // userId removed
});

       // ✅ AFTER — productId carries the full object so getRestockItemProduct() can read it later
restockedItems.push({
  productId: { _id: product._id, name: product.name, category: product.category, unit: product.unit },
  quantity: qty,
  note: globalNote || "Restocking",
});
      }

     const token = localStorage.getItem("token");
await fetch("/api/restockHistory", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({ items: restockedItems }),  // userId removed
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
      <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-800">Not signed in</h2>
          <p className="text-sm text-gray-600 mt-2">Please log in to restock products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />
  
      <main className="flex-grow container mx-auto px-3 sm:px-4 py-4 sm:py-6">
  
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            Restock Products
          </h1>
  
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFormatModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold shadow-md transition-colors text-xs sm:text-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Format Guide
            </button>

            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-semibold shadow-md transition-colors text-xs sm:text-sm"
            >
              <Upload className="w-4 h-4" />
              Bulk Upload
            </button>

            <button
              onClick={() => router.push("/dashboard/stocks")}
              className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 rounded-lg font-semibold transition-colors text-xs sm:text-sm"
            >
              Back
            </button>
          </div>
        </div>
  
        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or category"
            className="w-full sm:flex-1 border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-600 outline-none"
          />
  
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="w-full sm:w-48 border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-green-600 outline-none"
          >
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="category">Category</option>
          </select>
        </div>
  
        {/* Global Note */}
        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-semibold text-gray-900 mb-1.5">
            Restock Reason / Note
          </label>
          <input
            type="text"
            value={globalNote}
            onChange={(e) => setGlobalNote(e.target.value)}
            className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-green-600 outline-none"
            placeholder="e.g., Weekly Monday Restock"
          />
        </div>
  
        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {loading ? (
            <div className="text-center py-6 text-gray-900 font-medium text-sm">
              Loading...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-6 text-gray-900 font-medium text-sm">
              No products found
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p._id}
                className="border border-gray-300 rounded-lg p-3 bg-white shadow-sm"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  {p.name}
                </h3>
                <p className="text-xs text-gray-800 mb-2">
                  {p.category || "Uncategorized"}
                </p>
  
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={restockValues[p._id] ?? ""}
                    onChange={(e) => handleQuantityChange(p._id, e.target.value)}
                    placeholder="0"
                    className="w-20 border border-gray-400 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                  />
                  <span className="text-xs font-medium text-gray-900">
                    {p.unit}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
  
        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto bg-white rounded-lg sm:rounded-xl shadow-md border border-gray-300">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-green-600 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Product Name</th>
                <th className="px-3 py-2.5 text-left font-semibold">Category</th>
                <th className="px-3 py-2.5 text-left font-semibold">
                  Quantity (+ / -)
                </th>
                <th className="px-3 py-2.5 text-left font-semibold">Unit</th>
              </tr>
            </thead>
  
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-900 font-medium">
                    Loading...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-900 font-medium">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, i) => (
                  <tr
                    key={p._id}
                    className={`border-t ${
                      i % 2 === 0 ? "bg-gray-50" : "bg-white"
                    } hover:bg-green-50`}
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="px-3 py-2.5 text-gray-900">
                      {p.category || "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        value={restockValues[p._id] ?? ""}
                        onChange={(e) =>
                          handleQuantityChange(p._id, e.target.value)
                        }
                        placeholder="0"
                        className="w-24 border border-gray-400 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-gray-900">
                      {p.unit}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
  
        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
          <RestockPdfGenerator
            items={Object.entries(restockValues)
              .filter(([_, qty]) => qty !== 0)
             // ✅ AFTER
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
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold shadow-lg text-xs sm:text-sm"
          >
            Save Restock
          </button>
        </div>
      </main>
  
      <Footer />

      {/* Modals */}
      {showBulkModal && (
        <BulkRestockModal
          userId={userId}
          products={products}
          globalNote={globalNote}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            fetchProducts();
            setShowBulkModal(false);
          }}
        />
      )}

      {showFormatModal && (
        <RestockFormatModal onClose={() => setShowFormatModal(false)} />
      )}
    </div>
  );
}