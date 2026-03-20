// src/app/dashboard/stocks/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from "@/types/stocks.types";
import StockHeader from "./StockHeader";
import StockTable from "./StockTable";
import EmptyStockModal from "./EmptyStockModal";

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
      const token = localStorage.getItem("token");
const res = await fetch(`/api/products`, {
  headers: { "Authorization": `Bearer ${token}` },
});
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
  
    toast.loading("Generating stock report...");
  
    try {
      const doc = new jsPDF("p", "pt", "a4");
  
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 40;
  
      /* ================= DATE / TIME ================= */
      const now = new Date();
      const date = now.toLocaleDateString("en-IN");
      const time = now.toLocaleTimeString("en-IN");
  
      /* ================= HEADER ================= */
      doc.setFillColor(37, 99, 235); // blue-600
      doc.rect(0, 0, pageWidth, 70, "F");
  
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("STOCK REPORT", marginX, 42);
  
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("IceCream Inventory System", marginX, 58);
  
      /* ================= META ================= */
      doc.setTextColor(0);
      doc.setFontSize(10);
  
      doc.text(`Generated Date : ${date}`, marginX, 100);
      doc.text(`Generated Time : ${time}`, marginX, 115);
      doc.text(`Total Products : ${filteredProducts.length}`, marginX, 130);
  
      /* ================= SUMMARY ================= */
      const lowStockCount = filteredProducts.filter(
        (p) => p.minStock !== undefined && p.quantity < p.minStock
      ).length;
  
      doc.setFont("helvetica", "bold");
      doc.text("Summary", marginX, 160);
  
      doc.setFont("helvetica", "normal");
      doc.text(`• Total Items        : ${filteredProducts.length}`, marginX, 180);
      doc.text(`• Low Stock Items    : ${lowStockCount}`, marginX, 195);
  
      /* ================= TABLE ================= */
      const tableBody = filteredProducts.map((p, i) => [
        i + 1,
        p.name,
        p.category || "-",
        String(p.quantity),
        p.packUnit || "-",
        p.minStock !== undefined ? String(p.minStock) : "-",
      ]);
  
      autoTable(doc, {
        startY: 225,
        head: [[
          "#",
          "Product Name",
          "Category",
          "Quantity",
          "Pack Unit",
          "Min Stock",
        ]],
        body: tableBody,
  
        theme: "grid", // ✅ vertical + horizontal lines
  
        styles: {
          fontSize: 10,
          cellPadding: 6,
          valign: "middle",
          textColor: 20,
        },
  
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
  
        bodyStyles: {
          halign: "center",
        },
  
        columnStyles: {
          0: { cellWidth: 30, halign: "center" },
          1: { cellWidth: 160, halign: "left" },
          2: { cellWidth: 90, halign: "left" },
          3: { cellWidth: 70 },
          4: { cellWidth: 80 },
          5: { cellWidth: 70 },
        },
  
        didParseCell: (data) => {
          if (data.section === "body") {
            const product = filteredProducts[data.row.index];
            const isLow =
              product.minStock !== undefined &&
              product.quantity < product.minStock;
  
            if (isLow) {
              data.cell.styles.fillColor = [255, 230, 230];
              data.cell.styles.textColor = [180, 0, 0];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
  
        didDrawPage: (data) => {
          doc.setFontSize(9);
          doc.setTextColor(120);
          doc.text(
            `Page ${data.pageNumber}`,
            pageWidth / 2,
            pageHeight - 20,
            { align: "center" }
          );
        },
      });
  
      /* ================= FOOTER ================= */
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        "Generated by IceCream Inventory System",
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
  
      /* ================= SAVE ================= */
      const fileName = `STOCK-REPORT-${getDateTimeString()}.pdf`;
      doc.save(fileName);
  
      toast.dismiss();
      toast.success("Stock report downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("Failed to generate stock report");
    }
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
      const token = localStorage.getItem("token");
const res = await fetch("/api/products/empty", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({}),   // userId removed — server uses token
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
        <StockHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showLowStock={showLowStock}
          setShowLowStock={setShowLowStock}
          filteredProducts={filteredProducts}
          downloadStockReport={downloadStockReport}
          setShowEmptyModal={setShowEmptyModal}
          products={products}
        />

<div className="flex flex-wrap items-center gap-3 mb-4 mt-4">

<button
  onClick={() => toggleSort("name")}
  className={`px-3 py-1.5 rounded text-sm font-semibold ${
    sortBy === "name"
      ? "bg-blue-600 text-white"
      : "bg-gray-200 text-gray-900 hover:bg-gray-300"
  }`}
>
  Sort by Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
</button>

<button
  onClick={() => toggleSort("category")}
  className={`px-3 py-1.5 rounded text-sm font-semibold ${
    sortBy === "category"
      ? "bg-blue-600 text-white"
      : "bg-gray-200 text-gray-900 hover:bg-gray-300"
  }`}
>
  Sort by Category {sortBy === "category" && (sortOrder === "asc" ? "↑" : "↓")}
</button>

<button
  onClick={() => toggleSort("quantity")}
  className={`px-3 py-1.5 rounded text-sm font-semibold ${
    sortBy === "quantity"
      ? "bg-blue-600 text-white"
      : "bg-gray-200 text-gray-900 hover:bg-gray-300"
  }`}
>
  Sort by Quantity {sortBy === "quantity" && (sortOrder === "asc" ? "↑" : "↓")}
</button>

{/* CLEAR SORT */}
{sortBy && (
  <button
    onClick={() => {
      setSortBy(null);
      setSortOrder("asc");
    }}
    className="px-3 py-1.5 rounded text-sm font-semibold bg-red-600 hover:bg-red-700 text-white"
  >
    Clear Sort
  </button>
)}
</div>


        <StockTable
          filteredProducts={filteredProducts}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          toggleSort={toggleSort}
        />
      </main>

      <Footer />

      <EmptyStockModal
        showEmptyModal={showEmptyModal}
        setShowEmptyModal={setShowEmptyModal}
        confirmText={confirmText}
        setConfirmText={setConfirmText}
        emptying={emptying}
        emptyStock={emptyStock}
      />
    </div>
  );
}
