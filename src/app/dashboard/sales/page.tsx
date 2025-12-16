// src/app/dashboard/sales/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import {
  IndianRupee,
  BarChart3,
  TrendingUp,
  Users,
  CalendarRange,
} from "lucide-react";

type QuantityTotals = {
  piece: number;
  box: number;
  kg: number;
  litre: number;
  gm: number;
  ml: number;
};

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
  at: string; // ISO
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

// Presets including custom
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

// ✅ Local YYYY-MM-DD (no timezone shift)
function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SalesPage() {
  const [userId, setUserId] = useState<string | null>(null);

  // Range filters
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

  // Sort modes
  const [ledgerSortMode, setLedgerSortMode] =
    useState<LedgerSortMode>("date-desc");
  const [customerSortMode, setCustomerSortMode] =
    useState<CustomerSortMode>("net-desc");

  const handleClearFilters = () => {
    setRangePreset("all");  // go back to default preset
    setFrom("");            // clear date inputs
    setTo("");              // clear date inputs
  };

  // Read userId from localStorage (adjust if your app stores it differently)
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

  // 🔁 When preset changes, recompute from/to using LOCAL date math
  useEffect(() => {
    // "all" -> no date filters
    if (rangePreset === "all") {
      setFrom("");
      setTo("");
      return;
    }

    // "custom" -> keep whatever user typed
    if (rangePreset === "custom") {
      return;
    }

    const now = new Date();
    let fromDate = new Date(now);
    let toDate = new Date(now);

    switch (rangePreset) {
      case "today": {
        // from = today, to = today
        // fromDate/toDate already = now
        break;
      }
      case "yesterday": {
        fromDate.setDate(fromDate.getDate() - 1);
        toDate.setDate(toDate.getDate() - 1);
        break;
      }
      case "thisMonth": {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        // toDate = today
        break;
      }
      case "thisYear": {
        fromDate = new Date(now.getFullYear(), 0, 1);
        // toDate = today
        break;
      }
      case "7d": {
        fromDate.setDate(fromDate.getDate() - 6); // last 7 days including today
        // toDate = today
        break;
      }
      case "30d": {
        fromDate.setDate(fromDate.getDate() - 29); // last 30 days including today
        // toDate = today
        break;
      }
      case "90d": {
        fromDate.setDate(fromDate.getDate() - 89); // last 90 days including today
        // toDate = today
        break;
      }
      default:
        break;
    }

    setFrom(toDateInputValue(fromDate));
    setTo(toDateInputValue(toDate));
  }, [rangePreset]);

  // Fetch sales summary
  useEffect(() => {
    if (!userId) return;

    const params = new URLSearchParams({ userId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const url = `/api/sales/summary?${params.toString()}`;

    setSummaryLoading(true);
    setSummaryError(null);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: SalesSummaryResponse) => {
        setSummary(data);
      })
      .catch((err) => {
        console.error(err);
        setSummaryError("Failed to load sales summary");
      })
      .finally(() => setSummaryLoading(false));
  }, [userId, from, to]);

  // Fetch customers once (for this user)
  useEffect(() => {
    if (!userId) return;

    const params = new URLSearchParams({ userId });
    const url = `/api/customers?${params.toString()}`;

    setCustomersLoading(true);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: any[]) => {
        const mapped: CustomerItem[] = data.map((c: any) => ({
          _id: String(c._id),
          name: c.name,
          shopName: c.shopName,
          debit: Number(c.debit || 0),
          credit: Number(c.credit || 0),
          totalSales: Number(c.totalSales || 0),
        }));
        setCustomers(mapped);
        if (mapped.length && !selectedCustomerId) {
          setSelectedCustomerId(mapped[0]._id);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setCustomersLoading(false));
    // 🔧 only depend on userId so we don't reset selection repeatedly
  }, [userId]);

  // Fetch customer ledger whenever selection / range changes
  useEffect(() => {
    if (!userId || !selectedCustomerId) return;

    const params = new URLSearchParams({
      userId,
      customerId: selectedCustomerId,
    });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const url = `/api/sales/customer-ledger?${params.toString()}`;

    setLedgerLoading(true);
    setCustomerLedger(null);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: CustomerLedgerResponse) => {
        setCustomerLedger(data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLedgerLoading(false));
  }, [userId, selectedCustomerId, from, to]);

  // Sorted ledger
  const sortedLedger = useMemo(() => {
    if (!customerLedger) return [];

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

  // Sorted customers
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Header + Filters */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-700 flex items-center gap-2">
              <BarChart3 className="w-7 h-7" />
              Sales Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track total sales, payments, credits/debits and customer khata.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white rounded-xl shadow-sm px-3 py-2 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-600">
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
            <span className="text-xs text-gray-400">
              All bills (excluding discarded)
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
            <span className="text-xs text-gray-400">In selected period</span>
          </div>

          {/* Business Debit / Credit */}
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

          {/* Money division */}
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
              On Debt (outstanding):{" "}
              <span className="font-semibold text-red-600">
                {summary
                  ? formatINR(summary.paymentBreakdown.outstandingDebt)
                  : "--"}
              </span>
            </p>
          </div>
        </section>

        {/* Quantities + Daily timeline */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Quantities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 xl:col-span-1">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Quantities Sold (Total)
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {([
                ["Box", "box"],
                ["Kg", "kg"],
                ["Litre", "litre"],
                ["Piece", "piece"],
                ["Gram", "gm"],
                ["ML", "ml"],
              ] as const).map(([label, key]) => (
                <div
                  key={key}
                  className="flex flex-col border border-gray-100 rounded-lg px-3 py-2 bg-gray-50/60"
                >
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-base font-semibold text-gray-800">
                    {summary ? (summary.quantities as any)[key] || 0 : "--"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 xl:col-span-2 overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              Daily Timeline (Sales & Payments)
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
                    <th className="px-3 py-2 font-semibold text-gray-500">
                      Box
                    </th>
                    <th className="px-3 py-2 font-semibold text-gray-500">
                      Kg
                    </th>
                    <th className="px-3 py-2 font-semibold text-gray-500">
                      Litre
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summaryLoading && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-4 text-center text-gray-400"
                      >
                        Loading...
                      </td>
                    </tr>
                  )}
                  {!summaryLoading && summary && summary.daily.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
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
                        <td className="px-3 py-2">{d.quantities.box}</td>
                        <td className="px-3 py-2">{d.quantities.kg}</td>
                        <td className="px-3 py-2">{d.quantities.litre}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Customer Khata Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Customers list */}
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

          {/* Ledger for selected customer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-green-500" />
              Customer Credit / Debit History
            </h2>

            {!selectedCustomerId && (
              <div className="text-xs text-gray-500">
                Select a customer to view their khata.
              </div>
            )}

            {selectedCustomerId && ledgerLoading && (
              <div className="text-xs text-gray-500">Loading ledger...</div>
            )}

            {selectedCustomerId && !ledgerLoading && customerLedger && (
              <div className="space-y-3">
                {/* Top summary */}
                <div className="flex flex-wrap justify-between gap-2 text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {customerLedger.customer.name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {customerLedger.customer.shopName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-500">
                      Debit:{" "}
                      <span className="font-semibold text-gray-800">
                        {formatINR(customerLedger.totals.debit)}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Credit:{" "}
                      <span className="font-semibold text-gray-800">
                        {formatINR(customerLedger.totals.credit)}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Net Balance:{" "}
                      <span
                        className={`font-semibold ${
                          customerLedger.totals.netBalance > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {formatINR(customerLedger.totals.netBalance)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Sort dropdown */}
                <div className="flex justify-end mb-2">
                  <select
                    value={ledgerSortMode}
                    onChange={(e) => setLedgerSortMode(e.target.value as LedgerSortMode)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-700 bg-white"
                  >
                    <option value="date-desc">Date: Latest first</option>
                    <option value="date-asc">Date: Oldest first</option>
                    <option value="debit-desc">Debit: High → Low</option>
                    <option value="credit-desc">Credit: High → Low</option>
                    <option value="type">Type</option>
                  </select>
                </div>

                {/* Ledger table */}
                <div className="overflow-auto max-h-80 text-xs border rounded-lg">
                  <table className="min-w-full text-left">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-gray-500">
                          Date
                        </th>
                        <th className="px-3 py-2 font-semibold text-gray-500">
                          Type
                        </th>
                        <th className="px-3 py-2 font-semibold text-gray-500">
                          Note / Order
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
                      {sortedLedger.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-4 text-center text-gray-400"
                          >
                            No entries found in this range
                          </td>
                        </tr>
                      )}
                      {sortedLedger.map((e) => (
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
                          <td className="px-3 py-2">
                            {e.method || "-"}
                          </td>
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
              </div>
            )}
          </div>
        </section>

        {summaryError && (
          <p className="text-xs text-red-500">{summaryError}</p>
        )}
      </main>

      <Footer />
    </div>
  );
}
