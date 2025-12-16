// icecream-inventory\src\app\dashboard\stocks\restock\page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Product {
  _id: string;
  userId: string;
  name: string;
  category?: string;
  unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
  quantity: number;
}

type SortType = "name-asc" | "name-desc" | "category";

export default function RestockPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔍 Search & Sort
  const [search, setSearch] = useState("");
  const [sortType, setSortType] = useState<SortType>("name-asc");

  // Stores quantity changes
  const [restockValues, setRestockValues] = useState<Record<string, number>>({});
  const [globalNote, setGlobalNote] = useState("Restocking");

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
      const res = await fetch(`/api/products?userId=${encodeURIComponent(userId)}`);
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

  // ✅ SEARCH + SORT (NO mutation of original data)
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // 🔍 Search by name or category
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }

    // 🔃 Sorting
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

      const restockedItems: any[] = [];

      for (const [id, qty] of updates) {
        const product = products.find((p) => p._id === id);
        if (!product) continue;

        const newQty = product.quantity + qty;

        await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, userId, quantity: newQty }),
        });

        restockedItems.push({
          productId: product._id,
          name: product.name,
          category: product.category,
          unit: product.unit,
          quantity: qty,
          note: globalNote || "Restocking",
        });
      }

      await fetch("/api/restockHistory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, items: restockedItems }),
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
      <div className="p-8 bg-gray-50 min-h-screen">
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

      <main className="flex-grow container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Restock Products</h1>
          <button
            onClick={() => router.push("/dashboard/stocks")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow"
          >
            Back
          </button>
        </div>

        {/* 🔍 Search & Sort */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product or category"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-600"
          />

          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-600"
          >
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="category">Category (Grouped)</option>
          </select>
        </div>

        {/* Note */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">
            Restock Reason / Note
          </label>
          <input
            type="text"
            value={globalNote}
            onChange={(e) => setGlobalNote(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-600"
          />
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl shadow-lg border border-gray-200">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-green-600 to-green-500 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Name</th>
                <th className="px-6 py-4 text-left">Category</th>
                <th className="px-6 py-4 text-left">Quantity (+/-)</th>
                <th className="px-6 py-4 text-left">Unit</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-600">
                    Loading...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, i) => (
                  <tr
                    key={p._id}
                    className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-green-50`}
                  >
                    <td className="px-6 py-4 font-medium">{p.name}</td>
                    <td className="px-6 py-4">{p.category || "-"}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={restockValues[p._id] ?? ""}
                        onChange={(e) => handleQuantityChange(p._id, e.target.value)}
                        className="w-28 border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-6 py-4">{p.unit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-lg"
          >
            Save
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
