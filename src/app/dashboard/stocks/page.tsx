// src/app/dashboard/stocks/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Boxes, RefreshCw, History as HistoryIcon } from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Product } from "@/types/stocks.types";
import StockHeader from "./StockHeader";
import StockTable from "./StockTable";
import EmptyStockModal from "./EmptyStockModal";

export default function StockPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  const [sortBy, setSortBy] = useState<"name" | "category" | "quantity" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [emptying, setEmptying] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {}
    }
  }, []);

  const fetchStocks = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
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
      let aValue: string | number, bValue: string | number;
      if (sortBy === "name") {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortBy === "category") {
        aValue = a.category?.toLowerCase() || "";
        bValue = b.category?.toLowerCase() || "";
      } else {
        aValue = a.quantity;
        bValue = b.quantity;
      }
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const getDateTimeString = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
  };

  const downloadStockReport = () => {
    if (filteredProducts.length === 0) {
      toast.error("No stock records to download");
      return;
    }
    toast.loading("Generating stock report…");
    try {
      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 40;
      const now = new Date();

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 70, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("STOCK REPORT", marginX, 42);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Ice Saarthi", marginX, 58);

      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.text(`Generated Date : ${now.toLocaleDateString("en-IN")}`, marginX, 100);
      doc.text(`Generated Time : ${now.toLocaleTimeString("en-IN")}`, marginX, 115);
      doc.text(`Total Products : ${filteredProducts.length}`, marginX, 130);

      const lowStockCount = filteredProducts.filter(
        (p) => p.minStock !== undefined && p.quantity < p.minStock
      ).length;

      doc.setFont("helvetica", "bold");
      doc.text("Summary", marginX, 160);
      doc.setFont("helvetica", "normal");
      doc.text(`• Total Items        : ${filteredProducts.length}`, marginX, 180);
      doc.text(`• Low Stock Items    : ${lowStockCount}`, marginX, 195);

      const tableBody = filteredProducts.map((p, i) => [
        i + 1, p.name, p.category || "-", String(p.quantity),
        p.packUnit || "-", p.minStock !== undefined ? String(p.minStock) : "-",
      ]);

      autoTable(doc, {
        startY: 225,
        head: [["#", "Product Name", "Category", "Quantity", "Pack Unit", "Min Stock"]],
        body: tableBody,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 6, valign: "middle", textColor: 20 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", halign: "center" },
        bodyStyles: { halign: "center" },
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
            const isLow = product.minStock !== undefined && product.quantity < product.minStock;
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
          doc.text(`Page ${data.pageNumber}`, pageWidth / 2, pageHeight - 20, { align: "center" });
        },
      });

      doc.setFontSize(9);
      doc.setTextColor(120);
    doc.text("Generated by Ice Saarthi", pageWidth / 2, pageHeight - 8, { align: "center" });
      doc.save(`STOCK-REPORT-${getDateTimeString()}.pdf`);

      toast.dismiss();
      toast.success("Stock report downloaded");
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("Failed to generate report");
    }
  };

  const requestEmptyStockOtp = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/products/empty-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send OTP");
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTP");
      return false;
    }
  };

  const emptyStock = async (otp: string) => {
    if (!userId) return;
    try {
      setEmptying(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/products/empty", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp }),
      });

      let data;
      try { data = await res.json(); } catch {
        throw new Error("Server returned non-JSON response.");
      }
      if (!res.ok) throw new Error(data?.error || "Failed to empty stock");

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

  const toggleSort = (field: "name" | "category" | "quantity") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 dash-content-offset">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-600 font-medium">Please log in to view stock data.</p>
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
        requestOtp={requestEmptyStockOtp}
      />
    </div>
  );
}