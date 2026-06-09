// src/app/dashboard/customers/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, Search, SlidersHorizontal, Upload,
  X, DollarSign, AlertTriangle, CheckCircle2, Loader2,
  Zap, ArrowRight,
} from "lucide-react";

import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import UpgradePromptModal from "@/app/components/UpgradePromptModal";

import CustomerForm from "./CustomerForm";
import CustomerList from "./CustomerList";
import CustomerViewModal from "./CustomerViewModal";
import CustomerReportPDF from "./CustomerReportPDF";
import BulkCustomerUploadModal from "./BulkCustomerUploadModal";

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

const SETTLEMENT_METHODS = ["Cash", "Bank/UPI"] as const;
type SettlementMethod = (typeof SETTLEMENT_METHODS)[number];

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

  // settlement modal
  const [settlementCustomer, setSettlementCustomer] = useState<Customer | null>(null);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementMethod, setSettlementMethod] = useState<SettlementMethod>("Cash");
  const [settlementNote, setSettlementNote] = useState("");
  const [settling, setSettling] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState(false);

  // bulk upload
  const [showBulkModal, setShowBulkModal] = useState(false);

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
    setSettlementAmount("");
    setSettlementMethod("Cash");
    setSettlementNote("");
    setSettlementSuccess(false);
    setViewCustomer(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  SETTLEMENT LOGIC (FIXED):
  //
  //  When owner adds money:
  //    - ALWAYS add to customer.credit  (money received goes into credit)
  //    - NEVER remove from customer.debit via this modal
  //    - Debit stays as it is (it represents outstanding dues from orders)
  //
  //  Quick Settlement:
  //    - Offsets credit against debit
  //    - credit > debit  → debit=0, credit = credit - debit
  //    - credit < debit  → debit = debit - credit, credit=0
  //    - credit == debit → both = 0
  // ─────────────────────────────────────────────────────────────────────────
  const handleSettle = async () => {
    if (!settlementCustomer) return;
    const amount = parseFloat(settlementAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }

    setSettling(true);
    try {
      const token = localStorage.getItem("token");

      // Always add to credit; never touch debit here
      const newCredit = (settlementCustomer.credit || 0) + amount;
      const newDebit = settlementCustomer.debit || 0; // unchanged

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
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      setSettlementSuccess(true);
      fetchCustomers();
      setTimeout(() => {
        setSettlementCustomer(null);
        setSettlementSuccess(false);
      }, 2200);
    } catch (err: any) {
      showToast(err.message || "Failed to record payment", "error");
    } finally {
      setSettling(false);
    }
  };

  // Quick Settlement: offset credit against debit
  const handleQuickSettle = async () => {
    if (!settlementCustomer) return;
    const currentCredit = settlementCustomer.credit || 0;
    const currentDebit = settlementCustomer.debit || 0;

    if (currentCredit <= 0) {
      showToast("No credit available for quick settlement", "error");
      return;
    }

    setSettling(true);
    try {
      const token = localStorage.getItem("token");

      let newCredit: number;
      let newDebit: number;

      if (currentCredit >= currentDebit) {
        // Credit covers all debit
        newDebit = 0;
        newCredit = currentCredit - currentDebit;
      } else {
        // Partial offset
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
      }, 2200);
    } catch (err: any) {
      showToast(err.message || "Failed to settle", "error");
    } finally {
      setSettling(false);
    }
  };

  // ── preview of what happens after adding money ─────────────────────────────
  const previewAmount = parseFloat(settlementAmount) || 0;
  const previewNewCredit = settlementCustomer
    ? (settlementCustomer.credit || 0) + previewAmount
    : 0;

  // Quick settlement preview
  const qsCredit = settlementCustomer?.credit || 0;
  const qsDebit = settlementCustomer?.debit || 0;
  const qsNewCredit = qsCredit >= qsDebit ? qsCredit - qsDebit : 0;
  const qsNewDebit = qsCredit >= qsDebit ? 0 : qsDebit - qsCredit;
  const canQuickSettle = qsCredit > 0 && qsDebit > 0;

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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DashboardNavbar />

      <main className="flex-grow w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-6">

        {/* ═══ PAGE HEADER ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Ice Saathi
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage your customer profiles, balances and history
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CustomerReportPDF customers={customers} />

            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <Upload size={15} />
              Bulk Import
            </button>

            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition"
            >
              <Plus size={15} />
              Add Customer
            </button>
          </div>
        </div>

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

      {/* ── Settlement / Add Credit Modal ── */}
      {settlementCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => !settling && setSettlementCustomer(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-fadeIn overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Add Payment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {settlementCustomer.name} — {settlementCustomer.shopName}
                </p>
              </div>
              <button
                onClick={() => setSettlementCustomer(null)}
                disabled={settling}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={15} />
              </button>
            </div>

            {settlementSuccess ? (
              <div className="flex flex-col items-center gap-3 px-5 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 size={30} className="text-emerald-600" />
                </div>
                <p className="text-base font-bold text-slate-900">Recorded Successfully!</p>
                <p className="text-sm text-slate-500 text-center">
                  Balance has been updated for this customer.
                </p>
              </div>
            ) : (
              <div className="px-5 py-5 space-y-4">

                {/* Current balances */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-3 text-center">
                    <div className="text-xs font-semibold text-red-500 mb-1 uppercase tracking-wide">Outstanding Debit</div>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(settlementCustomer.debit)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3 text-center">
                    <div className="text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">Current Credit</div>
                    <div className="text-lg font-bold text-emerald-700">
                      {formatCurrency(settlementCustomer.credit)}
                    </div>
                  </div>
                </div>

                {/* ── Quick Settlement — only show if both credit & debit > 0 ── */}
                {canQuickSettle && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap size={13} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-blue-900">Quick Settlement</p>
                          <p className="text-xs text-blue-600 mt-0.5 leading-snug">
                            Offset ₹{formatCurrency(Math.min(qsCredit, qsDebit)).replace("₹", "")} credit against debit
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold">
                            <span className="text-blue-700">
                              Credit {formatCurrency(qsCredit)}
                            </span>
                            <ArrowRight size={10} className="text-blue-400" />
                            <span className={qsNewCredit === 0 ? "text-slate-400" : "text-emerald-700"}>
                              {formatCurrency(qsNewCredit)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold">
                            <span className="text-blue-700">
                              Debit {formatCurrency(qsDebit)}
                            </span>
                            <ArrowRight size={10} className="text-blue-400" />
                            <span className={qsNewDebit === 0 ? "text-slate-400" : "text-red-600"}>
                              {formatCurrency(qsNewDebit)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleQuickSettle}
                        disabled={settling}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-60"
                      >
                        {settling ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Zap size={12} />
                        )}
                        Apply
                      </button>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400 font-medium">OR ADD PAYMENT</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Amount input */}
                <div>
                  <label className="text-sm font-semibold text-slate-800 block mb-1.5">
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    placeholder="Enter amount received"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {/* Preview */}
                  {previewAmount > 0 && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Credit will become{" "}
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(previewNewCredit)}
                      </span>
                      {" "}· Debit stays{" "}
                      <span className="font-semibold text-red-500">
                        {formatCurrency(settlementCustomer.debit)}
                      </span>
                    </p>
                  )}
                  {/* Fill debit shortcut */}
                  {(settlementCustomer.debit || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setSettlementAmount(String(settlementCustomer.debit))}
                      className="mt-1.5 text-xs text-blue-600 hover:underline font-medium"
                    >
                      Fill debit amount ({formatCurrency(settlementCustomer.debit)})
                    </button>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-sm font-semibold text-slate-800 block mb-1.5">
                    Payment Method
                  </label>
                  <div className="flex gap-2">
                    {SETTLEMENT_METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSettlementMethod(m)}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border transition ${
                          settlementMethod === m
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-sm font-semibold text-slate-800 block mb-1.5">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={settlementNote}
                    onChange={(e) => setSettlementNote(e.target.value)}
                    placeholder="E.g. Partial payment for July"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setSettlementCustomer(null)}
                    disabled={settling}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSettle}
                    disabled={settling || !settlementAmount || parseFloat(settlementAmount) <= 0}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {settling && <Loader2 size={14} className="animate-spin" />}
                    {settling ? "Recording…" : "Record Payment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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