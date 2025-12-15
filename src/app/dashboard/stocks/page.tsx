// src/app/dashboard/stocks/page.tsx

"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Product {
  _id: string;
  userId: string;
  name: string;
  category?: string;
  unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
  quantity: number;
  minStock?: number;
  packQuantity?: number;
  packUnit?: string;
}

export default function StockPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  // Sorting states
  const [sortBy, setSortBy] = useState<"name" | "category" | "quantity" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Empty-stock modal state
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [emptying, setEmptying] = useState(false);

  // Load userId from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {
        // ignore errors
      }
    }
  }, []);

  // Fetch stock data
  const fetchStocks = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/products?userId=${encodeURIComponent(userId)}`
      );
      if (!res.ok) throw new Error("Failed to fetch stocks");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchStocks();
  }, [userId]);

  // Apply filtering and sorting
  const filteredProducts = products
    .filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(searchTerm.toLowerCase());
      const isLowStock = p.minStock !== undefined && p.quantity < p.minStock;
      return matchSearch && (!showLowStock || isLowStock);
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      let aValue, bValue;
      if (sortBy === "name") {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortBy === "category") {
        aValue = a.category?.toLowerCase() || "";
        bValue = b.category?.toLowerCase() || "";
      } else if (sortBy === "quantity") {
        aValue = a.quantity;
        bValue = b.quantity;
      } else {
        return 0;
      }
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Group by category for display
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const key = product.category || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Format date/time for filename
  const getDateTimeString = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year}-${hours}-${minutes}`;
  };

  // Download Stock Report
  const downloadStockReport = () => {
    if (filteredProducts.length === 0) {
      toast.error("No stock records to download");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Stock Report", 14, 15);

    const now = new Date();
    const dateTime = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()} ${String(
      now.getHours()
    ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    doc.setFontSize(11);
    doc.text(`Generated on: ${dateTime}`, 14, 22);

    const tableData = filteredProducts.map((p) => [
      p.name,
      p.category || "-",
      String(p.quantity),
      p.packUnit || "-",
      p.minStock !== undefined ? p.minStock : "-",
    ]);

    autoTable(doc, {
      head: [["Name", "Category", "Quantity", "Pack Unit", "Min Stock"]],
      body: tableData,
      startY: 30,
      didParseCell: function (data) {
        if (data.section === "body") {
          const rowIndex = data.row.index;
          const product = filteredProducts[rowIndex];
          const isLow =
            product.minStock !== undefined &&
            product.quantity < product.minStock;

          if (isLow) {
            data.cell.styles.fillColor = [255, 200, 200];
            data.cell.styles.textColor = [180, 0, 0];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    const fileName = `STOCK-${getDateTimeString()}.pdf`;
    doc.save(fileName);
  };

  // Empty stock API call
  const emptyStock = async () => {
    if (!userId) return;
    if (confirmText !== "CONFIRM") {
      toast.error('Please type "CONFIRM" to proceed.');
      return;
    }

    try {
      setEmptying(true);
      const res = await fetch("/api/products/empty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        const text = await res.text().catch(() => "");
        console.error("Invalid JSON from /api/products/empty:", text);
        throw new Error(
          "Server returned non-JSON response. Check the route file and server logs."
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to empty stock");
      }

      toast.success("All stock emptied successfully");
      setShowEmptyModal(false);
      setConfirmText("");
      fetchStocks();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to empty stock");
    } finally {
      setEmptying(false);
    }
  };

  // Toggle sort
  const toggleSort = (field: "name" | "category" | "quantity") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // If not logged in
  if (!userId) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-800">Not signed in</h2>
          <p className="text-sm text-gray-600 mt-2">
            Please log in to view stock data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <main className="flex-grow container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Stock Management
          </h1>
          <div className="flex gap-3">
            {filteredProducts.length === 0 ? (
              <button
                disabled
                className="flex items-center gap-2 bg-gray-300 text-gray-600 font-medium px-4 py-2 rounded-lg shadow cursor-not-allowed"
              >
                No Stock to Export
              </button>
            ) : (
              <button
                onClick={downloadStockReport}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg shadow transition-all duration-300"
              >
                Download Stock Report
              </button>
            )}

            {/* EMPTY STOCK button — placed near Download Stock Report */}
            <button
              onClick={() => setShowEmptyModal(true)}
              disabled={products.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow font-medium transition-all duration-300 ${
                products.length === 0
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              Empty Stock
            </button>

            <button
              onClick={() => router.push("/dashboard/stocks/history")}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow"
            >
              View History
            </button>
            <button
              onClick={() => router.push("/dashboard/stocks/restock")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
            >
              Restock
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search by Name or Category"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-400 rounded px-3 py-2 w-64 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
            />
            Show Low Stock Items
          </label>
          <button
            onClick={() => {
              setSearchTerm("");
              setShowLowStock(false);
              setSortBy(null);
            }}
            className="bg-gray-300 hover:bg-gray-400 text-sm px-3 py-2 rounded text-gray-900 font-medium"
          >
            Reset
          </button>
        </div>

        {/* Sorting Controls */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => toggleSort("name")}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              sortBy === "name"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Sort by Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => toggleSort("category")}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              sortBy === "category"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Sort by Category {sortBy === "category" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => toggleSort("quantity")}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              sortBy === "quantity"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Sort by Quantity {sortBy === "quantity" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-2xl shadow-lg">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
              <tr>
                <th
                  className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort("name")}
                >
                  Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort("category")}
                >
                  Category {sortBy === "category" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort("quantity")}
                >
                  Quantity {sortBy === "quantity" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">
                  Pack Unit
                </th>
              </tr>
            </thead>
            <tbody>
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
                filteredProducts.map((p, i) => {
                  const isLow =
                    p.minStock !== undefined && p.quantity < p.minStock;
                  return (
                    <tr
                      key={p._id}
                      className={`text-gray-700 transition ${
                        isLow
                          ? "bg-red-50 text-red-700"
                          : i % 2 === 0
                          ? "bg-gray-50"
                          : "bg-white"
                      } hover:shadow-md`}
                    >
                      <td className="px-6 py-4 font-medium">{p.name}</td>
                      <td className="px-6 py-4">{p.category || "-"}</td>
                      <td className="px-6 py-4">{p.quantity}</td>
                      <td className="px-6 py-4">{p.packUnit || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />

      {/* Empty Stock Confirmation Modal */}
      {showEmptyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Are you sure you want to empty the stock?
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              This action will set <strong>all product quantities to 0</strong>.
              This cannot be undone.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Write <span className="font-bold">"CONFIRM"</span> if you want to
              continue
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700"
              placeholder="Type CONFIRM to enable"
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEmptyModal(false);
                  setConfirmText("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600"
                disabled={emptying}
              >
                Cancel
              </button>
              <button
                onClick={emptyStock}
                className={`px-4 py-2 rounded-lg font-medium ${
                  confirmText === "CONFIRM"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-red-300 text-white cursor-not-allowed"
                }`}
                disabled={confirmText !== "CONFIRM" || emptying}
              >
                {emptying ? "Emptying..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
