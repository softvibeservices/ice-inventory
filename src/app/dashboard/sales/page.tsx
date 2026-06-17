// src/app/dashboard/sales/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import SalesInsights from "./SalesInsights";

import {
  IndianRupee,
  BarChart3,
  TrendingUp,
  Users,
  CalendarRange,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle,
  LayoutGrid,
  LineChart,
  Package,
  Search,
  Download,
  Filter,
  X,
  Calendar,
  TrendingDown,
  ShoppingCart,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type QuantityTotals = Record<string, number>;

type DailyStat = {
  date: string;
  totalSales: number;
  totalOrders: number;
  quantities: QuantityTotals;
  cashReceived: number;
  bankReceived: number;
};

type PaymentBreakdown = {
  cash: number;
  bank: number;
  outstandingDebt: number;
};

type SalesSummaryResponse = {
  totalSales: number;
  totalOrders: number;
  quantities: QuantityTotals;
  paymentBreakdown: PaymentBreakdown;
  overallDebit: number;
  overallCredit: number;
  netReceivable: number;
  daily: DailyStat[];
};

type CustomerItem = {
  _id: string;
  name: string;
  shopName: string;
  debit: number;
  credit: number;
  totalSales: number;
};

type LedgerEntry = {
  id: string;
  type: "Sale" | "Payment" | "Adjustment";
  at: string;
  orderId?: string;
  serialNumber?: string;
  method?: string;
  note?: string;
  debit?: number;
  credit?: number;
};

type CustomerLedgerResponse = {
  customer: CustomerItem;
  ledger: LedgerEntry[];
  totals: {
    debit: number;
    credit: number;
    netBalance: number;
  };
};

type RangePreset =
  | "today"
  | "yesterday"
  | "thisMonth"
  | "thisYear"
  | "7d"
  | "30d"
  | "90d"
  | "all"
  | "custom";

type LedgerSortMode =
  | "date-desc"
  | "date-asc"
  | "debit-desc"
  | "credit-desc"
  | "type";

type CustomerSortMode =
  | "net-desc"
  | "net-asc"
  | "name-asc"
  | "name-desc"
  | "sales-desc";

type ViewMode = "overview" | "insights" | "products";

// ✅ Product Sales Types
type ProductSalesRow = {
  productId: string;
  productName: string;
  category?: string;
  unit: string;
  date: string;
  totalQuantity: number;
  orderCount: number;
  totalRevenue: number;
};

type ProductSalesSummary = {
  productId: string;
  productName: string;
  category?: string;
  unit: string;
  totalQuantity: number;
  orderCount: number;
};

type ProductSalesResponse = {
  rows: ProductSalesRow[];
  summary: ProductSalesSummary[];
};

type ProductGroupBy = "date" | "month";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatINR(v: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v || 0);
}

function formatDate(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonthYear(dateStr: string) {
  // "YYYY-MM" format
  if (!dateStr || dateStr.length < 7) return dateStr;
  const [year, month] = dateStr.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getUnitDisplayName(unit: string): string {
  const displayMap: Record<string, string> = {
    l: "Litre",
    litre: "Litre",
    litres: "Litre",
    gm: "Gram",
    g: "Gram",
    kg: "Kilogram",
    ml: "Millilitre",
    piece: "Piece",
    pieces: "Piece",
    box: "Box",
    boxes: "Box",
  };

  return (
    displayMap[unit.toLowerCase()] ||
    unit.charAt(0).toUpperCase() + unit.slice(1)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = (currentPage - 1) * (itemsPerPage || 10) + 1;
  const endItem = Math.min(currentPage * (itemsPerPage || 10), totalItems || 0);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            {getPageNumbers().map((page, idx) =>
              typeof page === "number" ? (
                <button
                  key={idx}
                  onClick={() => onPageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    currentPage === page
                      ? "z-10 bg-blue-600 text-white focus:z-20"
                      : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20"
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span
                  key={idx}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                >
                  ...
                </span>
              )
            )}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [rangePreset, setRangePreset] = useState<RangePreset>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [summary, setSummary] = useState<SalesSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [customerLedger, setCustomerLedger] =
    useState<CustomerLedgerResponse | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [ledgerSortMode, setLedgerSortMode] =
    useState<LedgerSortMode>("date-desc");
  const [customerSortMode, setCustomerSortMode] =
    useState<CustomerSortMode>("net-desc");

  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  // ✅ Product Sales State
  const [productSales, setProductSales] =
    useState<ProductSalesResponse | null>(null);
  const [productSalesLoading, setProductSalesLoading] = useState(false);
  const [productGroupBy, setProductGroupBy] =
    useState<ProductGroupBy>("date");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Pagination for Product Sales
  const [productSummaryPage, setProductSummaryPage] = useState(1);
  const [productDetailPage, setProductDetailPage] = useState(1);
  const PRODUCTS_PER_PAGE = 10;

  // Pagination for Customer Ledger
  const [ledgerPage, setLedgerPage] = useState(1);
  const LEDGER_ITEMS_PER_PAGE = 10;

  // ─── HANDLERS ───────────────────────────────────────────────────────────────

  const handleClearFilters = () => {
    setRangePreset("all");
    setFrom("");
    setTo("");
  };

  // ─── AUTH CHECK ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(stored || "{}");
    if (parsed?.role === "manager") {
      router.push("/dashboard");
    }
  }, [router]);

  // ─── LOAD USER ID ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;

    let id: string | null = null;
    id = window.localStorage.getItem("userId");

    if (!id) {
      try {
        const raw = window.localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?._id) id = String(parsed._id);
        }
      } catch {
        // ignore
      }
    }

    if (id) {
      setUserId(id);
    } else {
      setSummaryError("User not found. Please login again.");
    }
  }, []);

  // ─── DATE RANGE PRESET → from/to ────────────────────────────────────────────

  useEffect(() => {
    if (rangePreset === "custom") return;

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (rangePreset) {
      case "today":
        startDate = new Date(now);
        endDate = new Date(now);
        break;
      case "yesterday":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        endDate = new Date(startDate);
        break;
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now);
        break;
      case "thisYear":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now);
        break;
      case "7d":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        endDate = new Date(now);
        break;
      case "30d":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
        endDate = new Date(now);
        break;
      case "90d":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 89);
        endDate = new Date(now);
        break;
      case "all":
        setFrom("");
        setTo("");
        return;
    }

    if (startDate) setFrom(toDateInputValue(startDate));
    if (endDate) setTo(toDateInputValue(endDate));
  }, [rangePreset]);

  // ─── FETCH SALES SUMMARY ────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    const fetchSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(null);

     const token = localStorage.getItem("token");
const params = new URLSearchParams();
if (from) params.append("from", from);
if (to) params.append("to", to);

      try {
       const res = await fetch(`/api/sales/summary?${params.toString()}`, {
  headers: { "Authorization": `Bearer ${token}` },
});
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch summary");
        }
        const data = await res.json();
        setSummary(data);
      } catch (err: any) {
        console.error("fetchSummary error:", err);
        setSummaryError(err.message || "Unknown error");
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [userId, from, to]);

  // ─── FETCH CUSTOMERS ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    const fetchCustomers = async () => {
      setCustomersLoading(true);

      try {
        const token = localStorage.getItem("token");
const res = await fetch(`/api/customers`, {
  headers: { "Authorization": `Bearer ${token}` },
});
        if (!res.ok) {
          console.error("Failed to fetch customers");
          return;
        }
        const data = await res.json();
        setCustomers(data);
      } catch (err) {
        console.error("fetchCustomers error:", err);
      } finally {
        setCustomersLoading(false);
      }
    };

    fetchCustomers();
  }, [userId]);

  // ─── FETCH CUSTOMER LEDGER ──────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedCustomerId || !userId) {
      setCustomerLedger(null);
      return;
    }

    const fetchLedger = async () => {
      setLedgerLoading(true);
      const token = localStorage.getItem("token");
const params = new URLSearchParams({ customerId: selectedCustomerId });
if (from) params.append("from", from);
if (to) params.append("to", to);

      try {
        const res = await fetch(`/api/sales/customer-ledger?${params.toString()}`, {
  headers: { "Authorization": `Bearer ${token}` },
});
        if (!res.ok) {
          console.error("Failed to fetch ledger");
          return;
        }
        const data = await res.json();
        setCustomerLedger(data);
      } catch (err) {
        console.error("fetchLedger error:", err);
      } finally {
        setLedgerLoading(false);
      }
    };

    fetchLedger();
  }, [selectedCustomerId, userId, from, to]);

  // ✅ ─── FETCH PRODUCT SALES ─────────────────────────────────────────────────

  useEffect(() => {
    if (!userId || viewMode !== "products") return;

    const fetchProductSales = async () => {
      setProductSalesLoading(true);
     const token = localStorage.getItem("token");
const params = new URLSearchParams({ groupBy: productGroupBy });
if (from) params.append("from", from);
if (to) params.append("to", to);

      try {
        const res = await fetch(`/api/sales/product-sales?${params.toString()}`, {
  headers: { "Authorization": `Bearer ${token}` },
});

        if (!res.ok) {
          console.error("Failed to fetch product sales");
          return;
        }
        const data = await res.json();
        setProductSales(data);
      } catch (err) {
        console.error("fetchProductSales error:", err);
      } finally {
        setProductSalesLoading(false);
      }
    };

    fetchProductSales();
  }, [userId, from, to, productGroupBy, viewMode]);

  // ─── MEMOIZED SORTED DATA ───────────────────────────────────────────────────

  const sortedLedger = useMemo(() => {
    if (!customerLedger?.ledger) return [];
    const list = [...customerLedger.ledger];

    return list.sort((a, b) => {
      switch (ledgerSortMode) {
        case "date-asc":
          return new Date(a.at).getTime() - new Date(b.at).getTime();
        case "date-desc":
          return new Date(b.at).getTime() - new Date(a.at).getTime();
        case "debit-desc":
          return (b.debit || 0) - (a.debit || 0);
        case "credit-desc":
          return (b.credit || 0) - (a.credit || 0);
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
  }, [customerLedger, ledgerSortMode]);

  // Paginated Ledger
  const paginatedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * LEDGER_ITEMS_PER_PAGE;
    return sortedLedger.slice(start, start + LEDGER_ITEMS_PER_PAGE);
  }, [sortedLedger, ledgerPage]);

  const totalLedgerPages = useMemo(() => {
    return Math.ceil(sortedLedger.length / LEDGER_ITEMS_PER_PAGE);
  }, [sortedLedger]);

  // Reset ledger page when customer changes or sort changes
  useEffect(() => {
    setLedgerPage(1);
  }, [selectedCustomerId, ledgerSortMode]);

  const sortedCustomers = useMemo(() => {
    const list = [...customers];

    return list.sort((a, b) => {
      const netA = a.debit - a.credit;
      const netB = b.debit - b.credit;

      switch (customerSortMode) {
        case "net-asc":
          return netA - netB;
        case "net-desc":
          return netB - netA;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "sales-desc":
          return b.totalSales - a.totalSales;
        default:
          return 0;
      }
    });
  }, [customers, customerSortMode]);

  // ✅ Filtered Product Sales with Pagination
  const filteredProductSales = useMemo(() => {
    if (!productSales) {
      return { 
        rows: [], 
        summary: [], 
        totalSummary: 0,
        totalRows: 0,
        totalSummaryPages: 1,
        totalDetailPages: 1
      };
    }

    let filteredSummary = [...productSales.summary];
    let filteredRows = [...productSales.rows];

    // Category filter
    if (selectedCategory !== "all") {
      filteredSummary = filteredSummary.filter(
        (p) => p.category === selectedCategory
      );
      filteredRows = filteredRows.filter((p) => p.category === selectedCategory);
    }

    // Search filter
    if (productSearchQuery.trim()) {
      const query = productSearchQuery.toLowerCase();
      filteredSummary = filteredSummary.filter((p) =>
        p.productName.toLowerCase().includes(query)
      );
      filteredRows = filteredRows.filter((p) =>
        p.productName.toLowerCase().includes(query)
      );
    }

    // Calculate total pages
    const totalSummaryPages = Math.max(1, Math.ceil(filteredSummary.length / PRODUCTS_PER_PAGE));
    const totalDetailPages = Math.max(1, Math.ceil(filteredRows.length / PRODUCTS_PER_PAGE));

    // Paginate summary
    const summaryStart = (productSummaryPage - 1) * PRODUCTS_PER_PAGE;
    const paginatedSummary = filteredSummary.slice(summaryStart, summaryStart + PRODUCTS_PER_PAGE);

    // Paginate rows
    const rowsStart = (productDetailPage - 1) * PRODUCTS_PER_PAGE;
    const paginatedRows = filteredRows.slice(rowsStart, rowsStart + PRODUCTS_PER_PAGE);

    return { 
      rows: paginatedRows, 
      summary: paginatedSummary,
      totalSummary: filteredSummary.length,
      totalRows: filteredRows.length,
      totalSummaryPages,
      totalDetailPages
    };
  }, [productSales, selectedCategory, productSearchQuery, productSummaryPage, productDetailPage]);

  // Reset pagination when filters change
  useEffect(() => {
    setProductSummaryPage(1);
    setProductDetailPage(1);
  }, [selectedCategory, productSearchQuery]);

  // Get unique categories from product sales
  const productCategories = useMemo(() => {
    if (!productSales?.summary) return [];
    const cats = new Set<string>();
    productSales.summary.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [productSales]);

  // ─── PRESET BUTTONS ─────────────────────────────────────────────────────────

  const presetButtons: { key: RangePreset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "thisMonth", label: "This Month" },
    { key: "thisYear", label: "This Year" },
    { key: "7d", label: "Last 7 days" },
    { key: "30d", label: "Last 30 days" },
    { key: "90d", label: "Last 90 days" },
    { key: "all", label: "All time" },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dash-content-offset">
      <DashboardNavbar />

      <main className="flex-1 w-full">
        <div className="page-wrapper space-y-6">

        {/* ── PAGE HEADER + DATE FILTER ─────────────────────────────────── */}
        <section className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Standard page-header (title in slate-900, no icon in h1) */}
          <div className="page-header-left">
            <h1 className="page-title">Sales Analytics</h1>
            <p className="page-subtitle">
              Track sales, product performance, and customer accounts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white rounded-xl shadow-sm px-3 py-2 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600">
              <CalendarRange className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Date Range
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {presetButtons.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setRangePreset(key)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition ${
                    rangePreset === key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 w-full sm:w-auto items-center">
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setRangePreset("custom");
                  setFrom(e.target.value);
                }}
                className="px-2 py-1 text-xs border rounded-md bg-white flex-1 text-gray-500"
              />
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setRangePreset("custom");
                  setTo(e.target.value);
                }}
                className="px-2 py-1 text-xs border rounded-md bg-white flex-1 text-gray-500"
              />
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-2.5 py-1 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        {/* ── VIEW MODE TABS ────────────────────────────────────────────── */}
        <section className="flex items-center justify-center">
          <div className="inline-flex bg-white rounded-xl shadow-sm border border-gray-200 p-1 gap-1">
            <button
              onClick={() => setViewMode("overview")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                viewMode === "overview"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Overview
            </button>

            <button
              onClick={() => setViewMode("products")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                viewMode === "products"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Package className="w-4 h-4" />
              Product Sales
            </button>

            <button
              onClick={() => setViewMode("insights")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                viewMode === "insights"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <LineChart className="w-4 h-4" />
              Insights
            </button>
          </div>
        </section>

        {/* ── COUNTING RULES BANNER ─────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800">
            <p className="font-semibold mb-1">Sales Counting Rules:</p>
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Settled orders only
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Delivered orders only
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Pending/Unsettled excluded
              </span>
              {viewMode === "products" && (
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <Package className="w-3 h-3" />
                  Products counted when delivered
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════ OVERVIEW TAB ════════════════ */}
        {viewMode === "overview" && (
          <>
            {/* Top stat cards */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Total Sales */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Total Sales
                  </span>
                  <IndianRupee className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-gray-800">
                  {summaryLoading
                    ? "Loading..."
                    : summary
                    ? formatINR(summary.totalSales)
                    : "--"}
                </p>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Delivered &amp; settled only
                </span>
              </div>

              {/* Total Orders */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Total Orders
                  </span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-xl font-bold text-gray-800">
                  {summaryLoading
                    ? "Loading..."
                    : summary
                    ? summary.totalOrders
                    : "--"}
                </p>
                <span className="text-xs text-gray-400">
                  Delivered &amp; settled
                </span>
              </div>

              {/* Business Receivables */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Business Receivables
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Debit:{" "}
                  <span className="font-semibold text-gray-800">
                    {summary ? formatINR(summary.overallDebit) : "--"}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Credit:{" "}
                  <span className="font-semibold text-gray-800">
                    {summary ? formatINR(summary.overallCredit) : "--"}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Net:{" "}
                  <span className="font-semibold text-blue-700">
                    {summary ? formatINR(summary.netReceivable) : "--"}
                  </span>
                </p>
              </div>

              {/* Payment Split */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Payment Split
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Cash:{" "}
                  <span className="font-semibold text-gray-800">
                    {summary ? formatINR(summary.paymentBreakdown.cash) : "--"}
                  </span>
                </p>
                <p className="text-xs text-gray-600">
                  Bank/UPI:{" "}
                  <span className="font-semibold text-gray-800">
                    {summary ? formatINR(summary.paymentBreakdown.bank) : "--"}
                  </span>
                </p>
                <p className="text-xs text-gray-600">
                  On Debt:{" "}
                  <span className="font-semibold text-red-600">
                    {summary
                      ? formatINR(summary.paymentBreakdown.outstandingDebt)
                      : "--"}
                  </span>
                </p>
              </div>
            </section>

            {/* Daily timeline */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 overflow-hidden">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                Daily Sales Timeline
              </h2>
              <div className="overflow-auto max-h-72 text-xs">
                <table className="min-w-full text-left">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-gray-500">
                        Date
                      </th>
                      <th className="px-3 py-2 font-semibold text-gray-500">
                        Orders
                      </th>
                      <th className="px-3 py-2 font-semibold text-gray-500">
                        Sales
                      </th>
                      <th className="px-3 py-2 font-semibold text-gray-500">
                        Cash
                      </th>
                      <th className="px-3 py-2 font-semibold text-gray-500">
                        Bank/UPI
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryLoading && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-4 text-center text-gray-400"
                        >
                          Loading...
                        </td>
                      </tr>
                    )}
                    {!summaryLoading &&
                      summary &&
                      summary.daily.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-4 text-center text-gray-400"
                          >
                            No data in this range
                          </td>
                        </tr>
                      )}
                    {!summaryLoading &&
                      summary &&
                      summary.daily.map((d) => (
                        <tr key={d.date} className="border-t text-gray-700">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatDate(d.date)}
                          </td>
                          <td className="px-3 py-2">{d.totalOrders}</td>
                          <td className="px-3 py-2">
                            {formatINR(d.totalSales)}
                          </td>
                          <td className="px-3 py-2">
                            {formatINR(d.cashReceived)}
                          </td>
                          <td className="px-3 py-2">
                            {formatINR(d.bankReceived)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Customer Khata Section */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Customer List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:col-span-1">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Customers (Khata)
                </h2>
                <div className="flex justify-end mb-2">
                  <select
                    value={customerSortMode}
                    onChange={(e) =>
                      setCustomerSortMode(e.target.value as CustomerSortMode)
                    }
                    className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-700 bg-white"
                  >
                    <option value="net-desc">Outstanding: High → Low</option>
                    <option value="net-asc">Outstanding: Low → High</option>
                    <option value="name-asc">Name: A → Z</option>
                    <option value="name-desc">Name: Z → A</option>
                    <option value="sales-desc">Total Sales: High → Low</option>
                  </select>
                </div>
                <div className="border rounded-lg overflow-hidden max-h-80 flex flex-col">
                  <div className="flex-1 overflow-auto text-xs">
                    {customersLoading && (
                      <div className="p-3 text-gray-400 text-center">
                        Loading customers...
                      </div>
                    )}
                    {!customersLoading && sortedCustomers.length === 0 && (
                      <div className="p-3 text-gray-400 text-center">
                        No customers yet.
                      </div>
                    )}
                    {!customersLoading &&
                      sortedCustomers.map((c) => {
                        const net = c.debit - c.credit;
                        const isSelected = selectedCustomerId === c._id;
                        return (
                          <button
                            key={c._id}
                            onClick={() => setSelectedCustomerId(c._id)}
                            className={`w-full text-left px-3 py-2 border-b last:border-b-0 flex flex-col gap-0.5 hover:bg-blue-50 transition ${
                              isSelected ? "bg-blue-50" : "bg-white"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-800 text-xs">
                                {c.name}
                              </span>
                              <span
                                className={`text-xs font-semibold ${
                                  net > 0 ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                {formatINR(net)}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-500">
                              {c.shopName}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Customer Ledger */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:col-span-2">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Customer Ledger
                </h2>

                {!selectedCustomerId && (
                  <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                    Select a customer to view ledger
                  </div>
                )}

                {selectedCustomerId && ledgerLoading && (
                  <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                    Loading ledger...
                  </div>
                )}

                {selectedCustomerId && !ledgerLoading && customerLedger && (
                  <div>
                    {/* Customer info card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-4 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">
                            {customerLedger.customer.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {customerLedger.customer.shopName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">
                            Net Balance
                          </p>
                          <p
                            className={`text-sm font-bold ${
                              customerLedger.totals.netBalance > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {formatINR(customerLedger.totals.netBalance)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-red-700">
                          Debit: {formatINR(customerLedger.totals.debit)}
                        </span>
                        <span className="text-green-700">
                          Credit: {formatINR(customerLedger.totals.credit)}
                        </span>
                      </div>
                    </div>

                    {/* Sort controls */}
                    <div className="flex justify-end mb-2">
                      <select
                        value={ledgerSortMode}
                        onChange={(e) =>
                          setLedgerSortMode(e.target.value as LedgerSortMode)
                        }
                        className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-700 bg-white"
                      >
                        <option value="date-desc">Date: Newest First</option>
                        <option value="date-asc">Date: Oldest First</option>
                        <option value="debit-desc">Debit: High → Low</option>
                        <option value="credit-desc">Credit: High → Low</option>
                        <option value="type">Type</option>
                      </select>
                    </div>

                    {/* Ledger table */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-auto text-xs">
                        <table className="min-w-full text-left">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 font-semibold text-gray-500">
                                Date
                              </th>
                              <th className="px-3 py-2 font-semibold text-gray-500">
                                Type
                              </th>
                              <th className="px-3 py-2 font-semibold text-gray-500">
                                Details
                              </th>
                              <th className="px-3 py-2 font-semibold text-gray-500">
                                Method
                              </th>
                              <th className="px-3 py-2 font-semibold text-gray-500">
                                Debit
                              </th>
                              <th className="px-3 py-2 font-semibold text-gray-500">
                                Credit
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedLedger.length === 0 && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="px-3 py-4 text-center text-gray-400"
                                >
                                  No entries found in this range
                                </td>
                              </tr>
                            )}
                            {paginatedLedger.map((e) => (
                              <tr key={e.id} className="border-t text-gray-700">
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {formatDate(e.at)}
                                </td>
                                <td className="px-3 py-2">
                                  {e.type === "Sale" && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                      Sale
                                    </span>
                                  )}
                                  {e.type === "Payment" && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                      Payment
                                    </span>
                                  )}
                                  {e.type === "Adjustment" && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                                      Adj.
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="block">{e.note || "-"}</span>
                                  {e.serialNumber && (
                                    <span className="text-[11px] text-gray-400">
                                      Serial: {e.serialNumber}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">{e.method || "-"}</td>
                                <td className="px-3 py-2 text-red-600">
                                  {e.debit ? formatINR(e.debit) : "-"}
                                </td>
                                <td className="px-3 py-2 text-green-600">
                                  {e.credit ? formatINR(e.credit) : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Pagination for Ledger */}
                      {sortedLedger.length > 0 && (
                        <Pagination
                          currentPage={ledgerPage}
                          totalPages={totalLedgerPages || 1}
                          onPageChange={setLedgerPage}
                          totalItems={sortedLedger.length}
                          itemsPerPage={LEDGER_ITEMS_PER_PAGE}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ════════════════ PRODUCT SALES TAB ════════════════ */}
        {viewMode === "products" && (
          <>
            {/* Filters & Controls */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {productSearchQuery && (
                      <button
                        onClick={() => setProductSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Filter & Group By */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
                    >
                      <option value="all">All Categories</option>
                      {productCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">
                      Group By:
                    </span>
                    <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
                      <button
                        onClick={() => setProductGroupBy("date")}
                        className={`px-3 py-1 text-xs rounded-md transition ${
                          productGroupBy === "date"
                            ? "bg-white text-emerald-700 shadow"
                            : "text-gray-600"
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        onClick={() => setProductGroupBy("month")}
                        className={`px-3 py-1 text-xs rounded-md transition ${
                          productGroupBy === "month"
                            ? "bg-white text-emerald-700 shadow"
                            : "text-gray-600"
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Product Sales Summary Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-sm border border-emerald-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-700 uppercase">
                    Total Products Sold
                  </span>
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-900">
                  {productSalesLoading
                    ? "..."
                    : filteredProductSales.totalSummary}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Unique products delivered
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-700 uppercase">
                    Total Quantity
                  </span>
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {productSalesLoading
                    ? "..."
                    : (productSales?.summary || [])
                        .filter(p => 
                          (selectedCategory === "all" || p.category === selectedCategory) &&
                          (!productSearchQuery.trim() || p.productName.toLowerCase().includes(productSearchQuery.toLowerCase()))
                        )
                        .reduce((sum, p) => sum + p.totalQuantity, 0)
                        .toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  All units combined
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-purple-700 uppercase">
                    Total Orders
                  </span>
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {productSalesLoading
                    ? "..."
                    : (productSales?.summary || [])
                        .filter(p => 
                          (selectedCategory === "all" || p.category === selectedCategory) &&
                          (!productSearchQuery.trim() || p.productName.toLowerCase().includes(productSearchQuery.toLowerCase()))
                        )
                        .reduce((sum, p) => sum + p.orderCount, 0)
                        .toLocaleString()}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  With product sales
                </p>
              </div>
            </section>

            {/* Top Products Summary */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Top Products by Quantity Sold
                  </h2>
                  <span className="text-xs text-gray-500">
                    {filteredProductSales.totalSummary} products
                  </span>
                </div>

                <div className="overflow-auto text-xs">
                  {productSalesLoading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                      Loading product sales...
                    </div>
                  ) : filteredProductSales.summary.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                      No product sales in this period
                    </div>
                  ) : (
                    <table className="min-w-full text-left">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 font-semibold text-gray-500">
                            #
                          </th>
                          <th className="px-3 py-2 font-semibold text-gray-500">
                            Product
                          </th>
                          <th className="px-3 py-2 font-semibold text-gray-500">
                            Category
                          </th>
                          <th className="px-3 py-2 font-semibold text-gray-500">
                            Unit
                          </th>
                          <th className="px-3 py-2 font-semibold text-gray-500 text-right">
                            Total Quantity
                          </th>
                          <th className="px-3 py-2 font-semibold text-gray-500 text-right">
                            Orders
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProductSales.summary.map((product, idx) => {
                          const globalIndex = (productSummaryPage - 1) * PRODUCTS_PER_PAGE + idx + 1;
                          return (
                            <tr
                              key={product.productId}
                              className="border-t hover:bg-gray-50 transition"
                            >
                              <td className="px-3 py-2 text-gray-500">
                                {globalIndex}
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-semibold text-gray-800">
                                  {product.productName}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {product.category || "-"}
                              </td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                                  {getUnitDisplayName(product.unit)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                {product.totalQuantity.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {product.orderCount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              
              {/* Pagination for Summary */}
              {!productSalesLoading && filteredProductSales.summary.length > 0 && (
                <Pagination
                  currentPage={productSummaryPage}
                  totalPages={filteredProductSales.totalSummaryPages || 1}
                  onPageChange={setProductSummaryPage}
                  totalItems={filteredProductSales.totalSummary}
                  itemsPerPage={PRODUCTS_PER_PAGE}
                />
              )}
            </section>

            {/* Date/Month-wise Product Sales */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    {productGroupBy === "date"
                      ? "Daily Product Sales"
                      : "Monthly Product Sales"}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {filteredProductSales.totalRows} records
                  </span>
                </div>

                <div className="overflow-auto text-xs">
                  {productSalesLoading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                      Loading...
                    </div>
                  ) : filteredProductSales.rows.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                      No data available
                    </div>
                  ) : (
                    <table className="min-w-full text-left">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 font-semibold text-gray-500">
                            {productGroupBy === "date" ? "Date" : "Month"}
                          </th>
                          <th className="px-3 py-2 font-semibold text-gray-500">
                            Product
                          </th>
                          <th className="px-3 py-2 font-semibold text-gray-500">
                            Category
                          </th>
                          <th className="px-3 py-2 font-semibold text-gray-500">
                            Unit
                          </th>
                          <th className="px-3 py-2 font-semibold text-gray-500 text-right">
                            Quantity
                          </th>
                          <th className="px-3 py-2 font-semibold text-gray-500 text-right">
                            Orders
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProductSales.rows.map((row, idx) => (
                          <tr
                            key={`${row.productId}-${row.date}-${idx}`}
                            className="border-t hover:bg-gray-50 transition"
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                              {productGroupBy === "date"
                                ? formatDate(row.date)
                                : formatMonthYear(row.date)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-medium text-gray-800">
                                {row.productName}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {row.category || "-"}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">
                                {getUnitDisplayName(row.unit)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-800">
                              {row.totalQuantity.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {row.orderCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Pagination for Detail */}
              {!productSalesLoading && filteredProductSales.rows.length > 0 && (
                <Pagination
                  currentPage={productDetailPage}
                  totalPages={filteredProductSales.totalDetailPages || 1}
                  onPageChange={setProductDetailPage}
                  totalItems={filteredProductSales.totalRows}
                  itemsPerPage={PRODUCTS_PER_PAGE}
                />
              )}
            </section>
          </>
        )}

        {/* ════════════════ INSIGHTS TAB ════════════════ */}
        {viewMode === "insights" && (
          <SalesInsights
            daily={summary?.daily || []}
            quantities={summary?.quantities || {}}
            paymentBreakdown={
              summary?.paymentBreakdown || {
                cash: 0,
                bank: 0,
                outstandingDebt: 0,
              }
            }
            customers={customers}
            productSales={productSales}
            loading={summaryLoading || productSalesLoading}
          />
        )}

        {/* Error message */}
        {summaryError && <p className="text-xs text-red-500">{summaryError}</p>}

        </div>{/* end page-wrapper */}
      </main>

      <Footer />
    </div>
  );
}