// src/app/dashboard/customers/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import CustomerForm from "./CustomerForm";
import CustomerList from "./CustomerList";
import CustomerViewModal from "./CustomerViewModal";
import CustomerReportPDF from "./CustomerReportPDF";
import { Customer, FormState, SortMode } from "@/types/customer.type";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
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
  });
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settlementCustomer, setSettlementCustomer] = useState<Customer | null>(null);
  const [settling, setSettling] = useState(false);

  // Load user id
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Fetch customers
  const fetchCustomers = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
const res = await fetch(`/api/customers`, {
  headers: { "Authorization": `Bearer ${token}` },
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

  useEffect(() => {
    if (userId) fetchCustomers();
  }, [userId]);

  // Validation for primary contact
  const isPrimaryContactValid = (c: string) => /^\d{6,15}$/.test(c.replace(/\s+/g, ""));

  // Clean numbers
  const toNumberSafe = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  // Create or update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("You must be logged in");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!form.contacts[0] || !isPrimaryContactValid(form.contacts[0])) {
      toast.error("Primary contact required (6-15 digits)");
      return;
    }
    if (!form.shopName.trim()) {
      toast.error("Shop name is required");
      return;
    }
    if (!form.shopAddress.trim()) {
      toast.error("Shop address is required");
      return;
    }
    if (!form.area.trim()) {
      toast.error("Area is required");
      return;
    }

    const body: any = {
      name: form.name.trim(),
      contacts: form.contacts.map((c) => c.trim()).filter(Boolean),
      shopName: form.shopName.trim(),
      shopAddress: form.shopAddress.trim(),
      area: form.area.trim(),
      location: {
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      },
      remarks: form.remarks?.trim() || "",
      credit: toNumberSafe(form.credit),
      debit: toNumberSafe(form.debit),
      totalSales: toNumberSafe(form.totalSales),
    };

    try {
      setSaving(true);
      if (editingId) {
       const token = localStorage.getItem("token");
const res = await fetch("/api/customers", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({ id: editingId, ...body }),  // userId removed
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
       const token = localStorage.getItem("token");
const res = await fetch("/api/customers", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify(body),  // userId already in body, server ignores it for auth but uses it for creation — actually remove it:
});
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Creation failed");
        }
        const created = await res.json();
        setCustomers((prev) => [created, ...prev]);
        toast.success("Customer added");
      }
      setForm({
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
      });
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Start edit flow
  const handleEdit = (c: Customer) => {
    setEditingId(c._id);
    setShowForm(true);
    setForm({
      name: c.name || "",
      contacts: c.contacts?.length ? c.contacts.slice() : [""],
      shopName: c.shopName || "",
      shopAddress: c.shopAddress || "",
      area: c.area || "",
      latitude: c.location?.latitude?.toString() ?? "",
      longitude: c.location?.longitude?.toString() ?? "",
      remarks: c.remarks || "",
      credit: (c.credit ?? 0).toString(),
      debit: (c.debit ?? 0).toString(),
      totalSales: (c.totalSales ?? 0).toString(),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Open view modal
  const handleView = (c: Customer) => {
    setViewingCustomer(c);
  };

  // Delete modal actions
  const openDeleteModal = (id: string) => setDeleteId(id);
  const cancelDelete = () => setDeleteId(null);
  const performDelete = async () => {
    if (!userId || !deleteId) {
      toast.error("Action not allowed");
      return;
    }
    try {
      setDeleting(true);
     const token = localStorage.getItem("token");
const res = await fetch("/api/customers", {
  method: "DELETE",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({ id: deleteId }),  // userId removed
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

  // Settlement modal
  const openSettlementModal = (c: Customer) => {
    const credit = Number(c.credit ?? 0);
    if (!credit || credit <= 0) {
      toast.error("There is no credited amount for this customer.");
      return;
    }
    setSettlementCustomer(c);
  };
  const closeSettlementModal = () => {
    setSettlementCustomer(null);
  };
  const confirmSettlement = async () => {
    if (!userId || !settlementCustomer) {
      toast.error("Missing customer info");
      return;
    }
    const c = settlementCustomer;
    const credit = Number(c.credit ?? 0);
    const debit = Number(c.debit ?? 0);
    if (!Number.isFinite(credit) || credit <= 0) {
      toast.error("This customer has no credit to settle.");
      return;
    }
    if (!Number.isFinite(debit) || debit <= 0) {
      toast.error("This customer has no debit amount.");
      return;
    }
    const usedCredit = Math.min(credit, debit);
    const newDebit = debit - usedCredit;
    const newCredit = credit - usedCredit;
    try {
      setSettling(true);
      const body: any = {
        id: c._id,
        name: c.name,
        contacts: c.contacts,
        shopName: c.shopName,
        shopAddress: c.shopAddress,
        area: c.area || "",
        location: c.location || {},
        remarks: c.remarks || "",
        credit: newCredit,
        debit: newDebit,
        totalSales: c.totalSales ?? 0,
      };
     const token = localStorage.getItem("token");
const res = await fetch("/api/customers", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify(body),
});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Settlement update failed");
      }
      const updated = await res.json();
      setCustomers((prev) => prev.map((cust) => (cust._id === updated._id ? updated : cust)));
      toast.success(`Settlement done. Debit reduced by ₹${usedCredit.toFixed(2)}. New debit: ₹${newDebit.toFixed(2)}`);
      closeSettlementModal();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to settle credit against debit");
    } finally {
      setSettling(false);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setSortMode("default");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <DashboardNavbar />
  
      {/* ================= MAIN ================= */}
      <main className="flex-grow w-full max-w-[1400px] mx-auto px-3 sm:px-5 lg:px-8 py-6">
  
        {/* ===== Header ===== */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Customer Management
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-700">
              Manage customers, credits, debits and settlements easily.
            </p>
          </div>
  
          {/* ===== Actions ===== */}
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <input
              type="search"
              placeholder="Search name / shop / contact"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-72 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
  
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="w-full sm:w-56 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="default">Sort: Default</option>
              <option value="credit-asc">Credit ↑</option>
              <option value="credit-desc">Credit ↓</option>
              <option value="debit-asc">Debit ↑</option>
              <option value="debit-desc">Debit ↓</option>
              <option value="sales-asc">Sales ↑</option>
              <option value="sales-desc">Sales ↓</option>
            </select>
  
            <button
              onClick={handleClearFilters}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Clear
            </button>
            <CustomerReportPDF customers={customers} />
  
            <button
              onClick={() => {
                if (!showForm) {
                  setEditingId(null);
                  setForm({
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
                  });
                }
                setShowForm((s) => !s);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:from-blue-700 hover:to-indigo-800"
            >
              <Plus size={18} />
              {showForm ? "Close Form" : "Add Customer"}
            </button>
          </div>
        </div>
  
        {/* ===== Form ===== */}
        <div className="mb-6">
          <CustomerForm
            form={form}
            setForm={setForm}
            showForm={showForm}
            saving={saving}
            editingId={editingId}
            handleSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingId(null);
              setForm({
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
              });
            }}
          />
        </div>
  
        {/* ===== Customer List ===== */}
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
  
      {/* ================= VIEW MODAL ================= */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <CustomerViewModal
            customer={viewingCustomer}
            onClose={() => setViewingCustomer(null)}
            onDelete={(id) => {
              setViewingCustomer(null);
              openDeleteModal(id);
            }}
          />
        </div>
      )}
  
      {/* ================= SETTLEMENT MODAL ================= */}
      {settlementCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Settle Credit
            </h3>
  
            <p className="text-sm text-slate-700 mb-3">
              <span className="font-semibold">
                {settlementCustomer.name}
              </span>{" "}
              ({settlementCustomer.shopName})
            </p>
  
            <div className="space-y-2 text-sm">
              <p className="text-green-700 font-semibold">
                Credit: ₹{(settlementCustomer.credit || 0).toFixed(2)}
              </p>
              <p className="text-red-700 font-semibold">
                Debit: ₹{(settlementCustomer.debit || 0).toFixed(2)}
              </p>
            </div>
  
            <p className="mt-4 text-sm text-slate-700">
              Credit will be used to reduce debit. This action is irreversible.
            </p>
  
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeSettlementModal}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-800"
                disabled={settling}
              >
                Cancel
              </button>
              <button
                onClick={confirmSettlement}
                disabled={settling}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-70"
              >
                {settling ? "Settling..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* ================= DELETE MODAL ================= */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Delete Customer
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              This action cannot be undone.
            </p>
  
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={performDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}