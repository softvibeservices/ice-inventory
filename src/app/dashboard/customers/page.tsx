// src/app/dashboard/customers/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import PlanLimitWarning from "@/app/components/PlanLimitWarning";
import UpgradePromptModal from "@/app/components/UpgradePromptModal";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  SlidersHorizontal,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Lock,
  FileSpreadsheet,
  HelpCircle,
} from "lucide-react";
import CustomerForm from "./CustomerForm";
import CustomerList from "./CustomerList";
import CustomerViewModal from "./CustomerViewModal";
import CustomerReportPDF from "./CustomerReportPDF";
import { Customer, FormState, SortMode } from "@/types/customer.type";
import { useSubscription } from "@/hooks/useSubscription";
import BulkCustomerUploadModal from "./BulkCustomerUploadModal";
import CustomerCSVFormatModal from "./CustomerCSVFormatModal";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const emptyForm: FormState = {
  name: "",
  contacts: [""],
  shopName: "",
  shopAddress: "",
  area: "",
  latitude: "",
  longitude: "",
  remarks: "",
  credit: "0",
  debit: "0",
  totalSales: "0",
};

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [customers, setCustomers]               = useState<Customer[]>([]);
  const [userId,    setUserId]                  = useState<string | null>(null);
  const [loading,   setLoading]                 = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState<FormState>(emptyForm);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);

  // ── Filter / sort state ───────────────────────────────────────────────────
  const [search,   setSearch]   = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  // ── Modal state ───────────────────────────────────────────────────────────
  const [viewingCustomer,   setViewingCustomer]   = useState<Customer | null>(null);
  const [deleteId,          setDeleteId]          = useState<string | null>(null);
  const [deleting,          setDeleting]          = useState(false);
  const [settlementCustomer, setSettlementCustomer] = useState<Customer | null>(null);
  const [settling,          setSettling]          = useState(false);

  // ── Bulk upload / CSV format modals ───────────────────────────────────────
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showCSVFormat,  setShowCSVFormat]  = useState(false);

  // ── Subscription / plan ───────────────────────────────────────────────────
  const { subscription } = useSubscription();
  const [upgradeModal, setUpgradeModal] = useState(false);

  const customerLimit = subscription?.effectiveLimits.customers ?? null;
  const customerCount = customers.length;
  const isAtLimit     = customerLimit !== null && customerCount >= customerLimit;

  // ─────────────────────────────────────────────────────────────────────────
  // Bootstrap
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?._id) setUserId(String(parsed._id));
      } catch { /* ignore */ }
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────────────────────────────────

  const fetchCustomers = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch("/api/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (userId) fetchCustomers(); }, [userId]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const isPrimaryContactValid = (c: string) =>
    /^\d{6,15}$/.test(c.replace(/\s+/g, ""));

  const toNumberSafe = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId)                                  { toast.error("You must be logged in");                              return; }
    if (!form.name.trim())                        { toast.error("Customer name is required");                          return; }
    if (!form.contacts[0] || !isPrimaryContactValid(form.contacts[0])) {
      toast.error("Primary contact required (6–15 digits)");            return;
    }
    if (!form.shopName.trim())                    { toast.error("Shop name is required");                              return; }
    if (!form.shopAddress.trim())                 { toast.error("Shop address is required");                           return; }
    if (!form.area.trim())                        { toast.error("Area is required");                                   return; }

    const body: Record<string, unknown> = {
      name:     form.name.trim(),
      contacts: form.contacts.map((c) => c.trim()).filter(Boolean),
      shopName: form.shopName.trim(),
      shopAddress: form.shopAddress.trim(),
      area:     form.area.trim(),
      location: {
        latitude:  form.latitude  ? Number(form.latitude)  : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      },
      remarks:    form.remarks?.trim() || "",
      credit:     toNumberSafe(form.credit),
      debit:      toNumberSafe(form.debit),
      totalSales: toNumberSafe(form.totalSales),
    };

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      if (editingId) {
        // ── Update ──────────────────────────────────────────────────────────
        const res = await fetch("/api/customers", {
          method:  "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ id: editingId, ...body }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Update failed");
        }
        const updated = await res.json();
        setCustomers((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        toast.success("Customer updated");
        setEditingId(null);
      } else {
        // ── Create ──────────────────────────────────────────────────────────
        const res = await fetch("/api/customers", {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 403 && err?.upgradeRequired) { setUpgradeModal(true); return; }
          throw new Error(err?.error || "Creation failed");
        }
        const created = await res.json();
        setCustomers((prev) => [created, ...prev]);
        toast.success("Customer added");
      }

      setForm(emptyForm);
      setShowForm(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: Customer) => {
    setEditingId(c._id);
    setShowForm(true);
    setForm({
      name:       c.name        || "",
      contacts:   c.contacts?.length ? c.contacts.slice() : [""],
      shopName:   c.shopName    || "",
      shopAddress: c.shopAddress || "",
      area:       c.area        || "",
      latitude:   c.location?.latitude?.toString()  ?? "",
      longitude:  c.location?.longitude?.toString() ?? "",
      remarks:    c.remarks     || "",
      credit:     (c.credit     ?? 0).toString(),
      debit:      (c.debit      ?? 0).toString(),
      totalSales: (c.totalSales ?? 0).toString(),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleView = (c: Customer) => setViewingCustomer(c);

  const openDeleteModal = (id: string) => setDeleteId(id);
  const cancelDelete    = ()            => setDeleteId(null);

  const performDelete = async () => {
    if (!userId || !deleteId) { toast.error("Action not allowed"); return; }
    try {
      setDeleting(true);
      const token = localStorage.getItem("token");
      const res   = await fetch("/api/customers", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ id: deleteId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Delete failed");
      }
      toast.success("Customer deleted");
      setCustomers((prev) => prev.filter((c) => c._id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const openSettlementModal = (c: Customer) => {
    const credit = Number(c.credit ?? 0);
    if (!credit || credit <= 0) {
      toast.error("There is no credited amount for this customer.");
      return;
    }
    setSettlementCustomer(c);
  };

  const closeSettlementModal = () => setSettlementCustomer(null);

  const confirmSettlement = async () => {
    if (!settlementCustomer || !userId) return;
    try {
      setSettling(true);
      const token = localStorage.getItem("token");
      const res   = await fetch("/api/customers", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ id: settlementCustomer._id, action: "settle" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Settlement failed");
      }
      toast.success("Credit settled successfully");
      await fetchCustomers();
      setSettlementCustomer(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Settlement failed");
    } finally {
      setSettling(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Filter helpers
  // ─────────────────────────────────────────────────────────────────────────

  const hasActiveFilters = search !== "" || sortMode !== "default";
  const handleClearFilters = () => { setSearch(""); setSortMode("default"); };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <DashboardNavbar />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* ── Plan limit warning ─────────────────────────────────────────── */}
        {subscription && (
          <PlanLimitWarning
            customersCount={customerCount}
            customersLimit={customerLimit}
            planId={subscription.planId}
          />
        )}

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          {/* Title + usage count */}
          <div>
            <h1 className="text-xl font-bold text-slate-900">Customers</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {customerLimit !== null
                ? `${customerCount} / ${customerLimit} customers used`
                : "Manage your customer base"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Add Customer — disabled when at limit */}
            {isAtLimit ? (
              <button
                onClick={() => setUpgradeModal(true)}
                title={`Customer limit reached (${customerCount}/${customerLimit}). Upgrade to add more.`}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm
                           bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              >
                <Lock size={16} />
                Add Customer
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!showForm) { setEditingId(null); setForm(emptyForm); }
                  setShowForm((s) => !s);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
                  showForm
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-blue-600  text-white       hover:bg-blue-700"
                }`}
              >
                {showForm ? <X size={16} /> : <Plus size={16} />}
                {showForm ? "Close Form" : "Add Customer"}
              </button>
            )}

            {/* Bulk Upload */}
            <button
              onClick={() => setShowBulkUpload(true)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm
                         bg-green-600 text-white hover:bg-green-700 transition"
            >
              <FileSpreadsheet size={16} />
              Bulk Upload
            </button>

            {/* CSV Format Guide */}
            <button
              onClick={() => setShowCSVFormat(true)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm
                         bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
              title="View CSV / Excel format guide and download sample template"
            >
              <HelpCircle size={16} className="text-slate-500" />
              CSV Guide
            </button>

          </div>
        </div>

        {/* ── Add / Edit form ───────────────────────────────────────────── */}
        {!isAtLimit && (
          <CustomerForm
            form={form}
            setForm={setForm}
            showForm={showForm}
            saving={saving}
            editingId={editingId}
            handleSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
          />
        )}

        {/* ── Toolbar (search + sort + PDF) ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search name, shop, contact…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm
                         text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2
                         focus:ring-blue-500/20 focus:border-blue-400 transition"
            />
          </div>

          {/* Sort */}
          <div className="relative w-full sm:w-auto">
            <SlidersHorizontal size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2.5
                         text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                         focus:border-blue-400 transition"
            >
              <option value="default">Sort: Default</option>
              <option value="credit-asc">Credit ↑ (Low first)</option>
              <option value="credit-desc">Credit ↓ (High first)</option>
              <option value="debit-asc">Debit ↑ (Low first)</option>
              <option value="debit-desc">Debit ↓ (High first)</option>
              <option value="sales-asc">Sales ↑ (Low first)</option>
              <option value="sales-desc">Sales ↓ (High first)</option>
            </select>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white
                         px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              <X size={13} />
              Clear
            </button>
          )}

          {/* PDF Report */}
          <div className="sm:ml-auto">
            <CustomerReportPDF customers={customers} />
          </div>
        </div>

        {/* ── Customer list ─────────────────────────────────────────────── */}
        <CustomerList
          customers={customers}
          search={search}
          sortMode={sortMode}
          loading={loading}
          handleView={handleView}
          handleEdit={handleEdit}
          openSettlementModal={openSettlementModal}
          openDeleteModal={openDeleteModal}
        />
      </main>

      <Footer />

      {/* ════════════════════════════════════════════════════════════════════
          Modals
      ════════════════════════════════════════════════════════════════════ */}

      {/* View modal */}
      {viewingCustomer && (
        <CustomerViewModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          onDelete={(id) => { setViewingCustomer(null); openDeleteModal(id); }}
        />
      )}

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={cancelDelete}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 mb-4">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Customer?</h3>
              <p className="mt-1.5 text-sm text-slate-500">
                This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium
                           text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={performDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm
                           font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settlement confirmation ───────────────────────────────────────── */}
      {settlementCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={closeSettlementModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 mb-4">
                <CheckCircle size={20} className="text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Settle Credit</h3>
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{settlementCustomer.name}</span>{" "}
                — {settlementCustomer.shopName}
              </p>
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-slate-600">Credit</span>
                  <span className="text-sm font-bold text-emerald-600">
                    ₹{(settlementCustomer.credit || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-slate-600">Debit</span>
                  <span className="text-sm font-bold text-red-500">
                    ₹{(settlementCustomer.debit || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Credit will be used to reduce outstanding debit. This action is irreversible.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={closeSettlementModal}
                disabled={settling}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium
                           text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSettlement}
                disabled={settling}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm
                           font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {settling ? "Settling…" : "Confirm Settlement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade prompt ────────────────────────────────────────────────── */}
      <UpgradePromptModal
        open={upgradeModal}
        onClose={() => setUpgradeModal(false)}
        resource="customer"
        used={customerCount}
        limit={customerLimit}
        currentPlanId={subscription?.planId}
      />

      {/* ── Bulk Upload modal ─────────────────────────────────────────────── */}
      {showBulkUpload && (
        <BulkCustomerUploadModal
          userId={userId ?? ""}
          onClose={() => setShowBulkUpload(false)}
          onSuccess={fetchCustomers}
        />
      )}

      {/* ── CSV Format Guide modal ────────────────────────────────────────── */}
      {showCSVFormat && (
        <CustomerCSVFormatModal onClose={() => setShowCSVFormat(false)} />
      )}
    </div>
  );
}