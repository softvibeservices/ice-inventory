// src/app/dashboard/customers/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, Search, SlidersHorizontal, Upload,
  X, AlertTriangle, CheckCircle2, Loader2,
  Zap, ArrowRight, TrendingUp, TrendingDown, BarChart3,
  FileSpreadsheet,
} from "lucide-react";

import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import UpgradePromptModal from "@/app/components/UpgradePromptModal";

import CustomerForm from "./CustomerForm";
import CustomerList from "./CustomerList";
import CustomerViewModal from "./CustomerViewModal";
import CustomerReportPDF from "./CustomerReportPDF";
import BulkCustomerUploadModal from "./BulkCustomerUploadModal";
import CustomerCSVFormatModal from "./CustomerCSVFormatModal";

import { Customer, FormState, SortMode } from "@/types/customer.type";

// ─── constants ───────────────────────────────────────────────────────────────
const EMPTY_FORM: FormState = {
  name: "",
  contacts: [""],
  shopName: "",
  shopAddress: "",
  area: "",
  latitude: "",
  longitude: "",
  remarks: "",
  credit: "",
  debit: "",
  totalSales: "",
};

// ─── helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (v?: number) => {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

// ─────────────────────────────────────────────────────────────────────────────
//  Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  // ── state ──
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [showSortPanel, setShowSortPanel] = useState(false);

  // userId from localStorage
  const [userId, setUserId] = useState<string>("");

  // form / editing
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // view modal
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  // delete modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // settlement modal — Quick Settlement ONLY
  const [settlementCustomer, setSettlementCustomer] = useState<Customer | null>(null);
  const [settling, setSettling] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState(false);

  // bulk upload
  const [showBulkModal, setShowBulkModal] = useState(false);

  // ── NEW: file template modal (same pattern as products page) ──
  const [showFileTemplate, setShowFileTemplate] = useState(false);

  // toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // upgrade prompt
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [upgradeResource, setUpgradeResource] = useState<
    "invoice" | "customer" | "product" | "manager" | "deliveryPartner" | "feature"
  >("customer");
  const [upgradeUsed, setUpgradeUsed] = useState<number | undefined>(undefined);
  const [upgradeLimit, setUpgradeLimit] = useState<number | null>(null);

  // ── bootstrap userId ───────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?._id) setUserId(String(parsed._id));
      }
    } catch {
      // ignore
    }
  }, []);

  // ── data ───────────────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message || "Failed to load customers", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ── toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── form helpers ───────────────────────────────────────────────────────────
  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const handleEdit = (c: Customer) => {
    setEditingId(c._id);
    setForm({
      name: c.name,
      contacts: c.contacts?.length ? c.contacts : [""],
      shopName: c.shopName,
      shopAddress: c.shopAddress,
      area: c.area || "",
      latitude: String(c.location?.latitude || ""),
      longitude: String(c.location?.longitude || ""),
      remarks: c.remarks || "",
      credit: String(c.credit ?? ""),
      debit: String(c.debit ?? ""),
      totalSales: String(c.totalSales ?? ""),
    });
    setShowForm(true);
    setViewCustomer(null);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        contacts: form.contacts.filter((c) => c.trim()),
        shopName: form.shopName.trim(),
        shopAddress: form.shopAddress.trim(),
        area: form.area.trim(),
        remarks: form.remarks.trim(),
        credit: parseFloat(form.credit) || 0,
        debit: parseFloat(form.debit) || 0,
        totalSales: parseFloat(form.totalSales) || 0,
      };

      if (form.latitude && form.longitude) {
        payload.location = {
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
        };
      }

      if (editingId) payload.id = editingId;

      const res = await fetch("/api/customers", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.upgradeRequired) {
          setUpgradeResource("customer");
          setUpgradeUsed(data.used);
          setUpgradeLimit(data.limit ?? null);
          setUpgradeModal(true);
          return;
        }
        throw new Error(data.error || "Failed to save customer");
      }

      showToast(
        editingId ? "Customer updated successfully" : "Customer added successfully",
        "success"
      );
      handleCancel();
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message || "Failed to save customer", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/customers", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: deleteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      showToast("Customer deleted", "success");
      setDeleteId(null);
      setViewCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message || "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── settlement ─────────────────────────────────────────────────────────────
  const openSettlementModal = (c: Customer) => {
    setSettlementCustomer(c);
    setSettlementSuccess(false);
    setViewCustomer(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  QUICK SETTLEMENT LOGIC:
  //
  //  Offsets credit against debit:
  //    - credit > debit  → debit=0, credit = credit - debit
  //    - credit < debit  → debit = debit - credit, credit=0
  //    - credit == debit → both = 0
  //
  //  No manual amount input — settlement is always a full offset of
  //  whichever side is smaller.
  // ─────────────────────────────────────────────────────────────────────────
  const handleQuickSettle = async () => {
    if (!settlementCustomer) return;
    const currentCredit = settlementCustomer.credit || 0;
    const currentDebit = settlementCustomer.debit || 0;

    if (currentCredit <= 0 || currentDebit <= 0) {
      showToast("Both credit and debit must be greater than 0 to settle", "error");
      return;
    }

    setSettling(true);
    try {
      const token = localStorage.getItem("token");

      let newCredit: number;
      let newDebit: number;

      if (currentCredit >= currentDebit) {
        newDebit = 0;
        newCredit = currentCredit - currentDebit;
      } else {
        newDebit = currentDebit - currentCredit;
        newCredit = 0;
      }

      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: settlementCustomer._id,
          debit: newDebit,
          credit: newCredit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle");

      setSettlementSuccess(true);
      fetchCustomers();
      setTimeout(() => {
        setSettlementCustomer(null);
        setSettlementSuccess(false);
      }, 2400);
    } catch (err: any) {
      showToast(err.message || "Failed to settle", "error");
    } finally {
      setSettling(false);
    }
  };

  // ── Quick settlement preview values ────────────────────────────────────────
  const qsCredit = settlementCustomer?.credit || 0;
  const qsDebit = settlementCustomer?.debit || 0;
  const qsNewCredit = qsCredit >= qsDebit ? qsCredit - qsDebit : 0;
  const qsNewDebit = qsCredit >= qsDebit ? 0 : qsDebit - qsCredit;
  const canQuickSettle = qsCredit > 0 && qsDebit > 0;
  const offsetAmount = Math.min(qsCredit, qsDebit);

  // ── stats ──────────────────────────────────────────────────────────────────
  const totalCredit = customers.reduce((s, c) => s + (c.credit || 0), 0);
  const totalDebit = customers.reduce((s, c) => s + (c.debit || 0), 0);
  const totalSales = customers.reduce((s, c) => s + (c.totalSales || 0), 0);

  // ── sort options ───────────────────────────────────────────────────────────
  const sortOptions: { value: SortMode; label: string }[] = [
    { value: "default", label: "Default order" },
    { value: "credit-desc", label: "Highest credit first" },
    { value: "credit-asc", label: "Lowest credit first" },
    { value: "debit-desc", label: "Highest debit first" },
    { value: "debit-asc", label: "Lowest debit first" },
    { value: "sales-desc", label: "Highest sales first" },
    { value: "sales-asc", label: "Lowest sales first" },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dash-content-offset">
      <DashboardNavbar />

      <main className="flex-grow w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-6">

        {/* ═══ PAGE HEADER ═══ */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">Manage customer profiles, balances and history</p>
          </div>

          <div className="page-header-actions">
            <CustomerReportPDF customers={customers} />

            {/* ── NEW: File Templates button — mirrors the products page ── */}
            <button
              onClick={() => setShowFileTemplate(true)}
              className="btn btn-secondary btn-sm"
            >
              <FileSpreadsheet size={14} />
              File Templates
            </button>

            {/* Bulk Upload */}
            <button
              onClick={() => setShowBulkModal(true)}
              className="btn btn-secondary btn-sm"
            >
              <Upload size={14} />
              Bulk Upload
            </button>

            <button
              onClick={openAddForm}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} />
              Add Customer
            </button>
          </div>
        </div>

        {/* ═══ SUMMARY STATS ═══ */}
        {!loading && customers.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users size={13} className="text-blue-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customers</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{customers.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp size={13} className="text-emerald-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Credit</span>
              </div>
              <p className="text-base font-bold text-emerald-700 truncate">{formatCurrency(totalCredit)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingDown size={13} className="text-red-500" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Debit</span>
              </div>
              <p className="text-base font-bold text-red-600 truncate">{formatCurrency(totalDebit)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <BarChart3 size={13} className="text-violet-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Sales</span>
              </div>
              <p className="text-base font-bold text-violet-700 truncate">{formatCurrency(totalSales)}</p>
            </div>
          </div>
        )}

        {/* ═══ ADD / EDIT FORM ═══ */}
        <CustomerForm
          form={form}
          setForm={setForm}
          showForm={showForm}
          saving={saving}
          editingId={editingId}
          handleSubmit={handleSubmit}
          onCancel={handleCancel}
        />

        {/* ═══ SEARCH + SORT BAR ═══ */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by name, shop, area, or contact…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSortPanel((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
                sortMode !== "default"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={15} />
              Sort
              {sortMode !== "default" && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
              )}
            </button>

            {showSortPanel && (
              <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortMode(opt.value);
                      setShowSortPanel(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition ${
                      sortMode === opt.value
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {showSortPanel && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowSortPanel(false)}
          />
        )}

        {/* ═══ CUSTOMER LIST ═══ */}
        <CustomerList
          customers={customers}
          search={search}
          sortMode={sortMode}
          loading={loading}
          handleView={(c) => setViewCustomer(c)}
          handleEdit={handleEdit}
          openSettlementModal={openSettlementModal}
          openDeleteModal={(id) => setDeleteId(id)}
        />
      </main>

      <Footer />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* ── View Modal ── */}
      {viewCustomer && (
        <CustomerViewModal
          customer={viewCustomer}
          onClose={() => setViewCustomer(null)}
          onDelete={(id) => { setViewCustomer(null); setDeleteId(id); }}
          onSettle={openSettlementModal}
        />
      )}

      {/* ── Delete Confirmation ── */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setDeleteId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-fadeIn"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Customer?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This action cannot be undone. All data for this customer will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Settlement Modal ── */}
      {settlementCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => !settling && setSettlementCustomer(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-fadeIn overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Quick Settlement
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {settlementCustomer.name} — {settlementCustomer.shopName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettlementCustomer(null)}
                disabled={settling}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Body ── */}
            {settlementSuccess ? (
              /* Success state */
              <div className="flex flex-col items-center gap-3 px-5 py-14">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 size={32} className="text-emerald-600" />
                </div>
                <p className="text-lg font-bold text-slate-900">Settled Successfully!</p>
                <p className="text-sm text-slate-500 text-center max-w-xs">
                  The credit and debit balances have been offset and updated.
                </p>
              </div>
            ) : canQuickSettle ? (
              /* Quick settle available */
              <div className="px-5 py-6 space-y-5">

                {/* Current Balance Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-center">
                    <div className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mb-1.5">
                      Outstanding Debit
                    </div>
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(qsDebit)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center">
                    <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-1.5">
                      Available Credit
                    </div>
                    <div className="text-xl font-bold text-emerald-700">
                      {formatCurrency(qsCredit)}
                    </div>
                  </div>
                </div>

                {/* What will happen */}
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-3">
                    After Settlement
                  </p>
                  <div className="space-y-2.5">
                    {/* Credit row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-xs font-semibold text-slate-600">Credit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                          {formatCurrency(qsCredit)}
                        </span>
                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                        <span className={`text-xs font-bold tabular-nums ${qsNewCredit === 0 ? "text-slate-400" : "text-emerald-700"}`}>
                          {qsNewCredit === 0 ? "₹0.00" : formatCurrency(qsNewCredit)}
                        </span>
                      </div>
                    </div>
                    {/* Debit row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-xs font-semibold text-slate-600">Debit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-red-600 tabular-nums">
                          {formatCurrency(qsDebit)}
                        </span>
                        <ArrowRight size={12} className="text-slate-400 shrink-0" />
                        <span className={`text-xs font-bold tabular-nums ${qsNewDebit === 0 ? "text-slate-400" : "text-red-600"}`}>
                          {qsNewDebit === 0 ? "₹0.00" : formatCurrency(qsNewDebit)}
                        </span>
                      </div>
                    </div>
                    {/* Divider + offset line */}
                    <div className="pt-2 border-t border-blue-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-blue-700">Amount to be offset</span>
                        <span className="text-[13px] font-bold text-blue-800 tabular-nums">
                          {formatCurrency(offsetAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setSettlementCustomer(null)}
                    disabled={settling}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickSettle}
                    disabled={settling}
                    className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {settling ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Zap size={14} />
                    )}
                    {settling ? "Settling…" : "Confirm Settlement"}
                  </button>
                </div>
              </div>
            ) : (
              /* Cannot settle — missing credit or debit */
              <div className="px-5 py-8">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-center">
                    <div className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mb-1.5">
                      Outstanding Debit
                    </div>
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(qsDebit)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center">
                    <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-1.5">
                      Available Credit
                    </div>
                    <div className="text-xl font-bold text-emerald-700">
                      {formatCurrency(qsCredit)}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5 flex items-start gap-3 mb-5">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Settlement Not Available</p>
                    <p className="text-xs text-amber-700 mt-0.5 leading-snug">
                      {qsCredit <= 0
                        ? "This customer has no credit balance to offset against the debit."
                        : "This customer has no outstanding debit to settle against the credit."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSettlementCustomer(null)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NEW: File Templates modal — mirrors products page pattern ── */}
      {showFileTemplate && (
        <CustomerCSVFormatModal onClose={() => setShowFileTemplate(false)} />
      )}

      {/* ── Bulk Upload Modal ── */}
      {showBulkModal && (
        <BulkCustomerUploadModal
          userId={userId}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            fetchCustomers();
            showToast("Customers imported successfully", "success");
          }}
        />
      )}

      {/* ── Upgrade Prompt ── */}
      <UpgradePromptModal
        open={upgradeModal}
        onClose={() => setUpgradeModal(false)}
        resource={upgradeResource}
        used={upgradeUsed}
        limit={upgradeLimit}
      />

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg animate-fadeIn transition ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}