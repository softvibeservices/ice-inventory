// src/app/dashboard/customers/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Edit3,
  MapPin,
  Phone,
  Building,
  FileText,
  Eye,
  X,
} from "lucide-react";

import CustomerViewModal from "./CustomerViewModal";

interface Customer {
  _id: string;
  name: string;
  contacts: string[];
  shopName: string;
  shopAddress: string;
  location?: { latitude?: number; longitude?: number };
  credit: number;
  debit: number;
  totalSales: number;
  remarks?: string;
  createdAt?: string;
}

type FormState = {
  name: string;
  contacts: string[];
  shopName: string;
  shopAddress: string;
  latitude: string;
  longitude: string;
  remarks: string;
  credit: string;
  debit: string;
  totalSales: string;
};

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
    latitude: "",
    longitude: "",
    remarks: "",
    credit: "0",
    debit: "0",
    totalSales: "0",
  });

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // load user id
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

  // fetch customers
  const fetchCustomers = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?userId=${encodeURIComponent(userId)}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const inputBase =
    "w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  // contact handlers
  const addContactField = () => setForm((f) => ({ ...f, contacts: [...f.contacts, ""] }));
  const removeContactField = (index: number) => {
    if (index === 0) return;
    setForm((f) => ({ ...f, contacts: f.contacts.filter((_, i) => i !== index) }));
  };
  const updateContact = (index: number, value: string) => {
    const c = [...form.contacts];
    c[index] = value;
    setForm((f) => ({ ...f, contacts: c }));
  };

  // validation for primary contact
  const isPrimaryContactValid = (c: string) => /^\d{6,15}$/.test(c.replace(/\s+/g, ""));

  // clean numbers
  const toNumberSafe = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  // create or update
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

    // build body
    const body: any = {
      name: form.name.trim(),
      contacts: form.contacts.map((c) => c.trim()).filter(Boolean),
      shopName: form.shopName.trim(),
      shopAddress: form.shopAddress.trim(),
      location: {
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      },
      remarks: form.remarks?.trim() || "",
      userId,
      credit: toNumberSafe(form.credit),
      debit: toNumberSafe(form.debit),
      totalSales: toNumberSafe(form.totalSales),
    };

    try {
      setSaving(true);
      if (editingId) {
        // UPDATE
        const res = await fetch("/api/customers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, userId, ...body }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Update failed");
        }
        const updated = await res.json();
        // update local state
        setCustomers((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        toast.success("Customer updated");
        setEditingId(null);
      } else {
        // CREATE
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Creation failed");
        }
        const created = await res.json();
        setCustomers((prev) => [created, ...prev]);
        toast.success("Customer added");
      }

      // reset form + close
      setForm({
        name: "",
        contacts: [""],
        shopName: "",
        shopAddress: "",
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

  // start edit flow
  const handleEdit = (c: Customer) => {
    setEditingId(c._id);
    setShowForm(true);
    setForm({
      name: c.name || "",
      contacts: c.contacts?.length ? c.contacts.slice() : [""],
      shopName: c.shopName || "",
      shopAddress: c.shopAddress || "",
      latitude: c.location?.latitude?.toString() ?? "",
      longitude: c.location?.longitude?.toString() ?? "",
      remarks: c.remarks || "",
      credit: (c.credit ?? 0).toString(),
      debit: (c.debit ?? 0).toString(),
      totalSales: (c.totalSales ?? 0).toString(),
    });
    // smooth scroll to form in case list was long
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // open view modal
  const handleView = (c: Customer) => {
    setViewingCustomer(c);
  };

  // delete modal actions
  const openDeleteModal = (id: string) => setDeleteId(id);
  const cancelDelete = () => setDeleteId(null);

  const performDelete = async () => {
    if (!userId || !deleteId) {
      toast.error("Action not allowed");
      return;
    }
    try {
      setDeleting(true);
      const res = await fetch("/api/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId, userId }),
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

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.shopName.toLowerCase().includes(q) ||
      c.contacts.join(" ").toLowerCase().includes(q)
    );
  });

  const formatCurrency = (v?: number) =>
    typeof v === "number" ? `₹${v.toFixed(2)}` : "-";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Customer Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Add, view, edit or delete customers. Edit mode allows changing credit/debit/total sales.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <input
              type="search"
              placeholder="Search by name, shop or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={() => {
                // if already opening to edit, reset editing state
                if (!showForm) {
                  setEditingId(null);
                  setForm({
                    name: "",
                    contacts: [""],
                    shopName: "",
                    shopAddress: "",
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
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2 rounded-lg shadow"
            >
              <Plus size={18} /> <span className="text-sm font-medium">{showForm ? "Close Form" : "Add Customer"}</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className={`overflow-hidden transition-all duration-300 ${showForm ? "max-h-[1400px] mb-8" : "max-h-0"}`}>
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Customer Name *</label>
              <input
                className={inputBase + " text-lg"}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ramesh & Sons"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Primary Contact *</label>
              <div className="flex gap-2">
                <input
                  className={inputBase + " text-lg"}
                  value={form.contacts[0]}
                  onChange={(e) => updateContact(0, e.target.value)}
                  placeholder="e.g. 9876543210"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                />
                <span className="inline-flex items-center px-3 rounded-lg bg-gray-100 text-gray-600">
                  <Phone size={18} />
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Digits only (6–15). Add additional contacts below.</p>
            </div>

            {/* additional contacts */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Additional Contacts</label>
              <div className="space-y-3">
                {form.contacts.map((c, i) => {
                  if (i === 0) return null;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className={inputBase + " text-base"}
                        value={c}
                        onChange={(e) => updateContact(i, e.target.value)}
                        placeholder="Additional contact (optional)"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                      <button
                        type="button"
                        onClick={() => removeContactField(i)}
                        className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 px-3 py-2 rounded bg-red-50 border border-red-100"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
                <button type="button" onClick={addContactField} className="text-blue-600 hover:underline inline-flex items-center gap-2">
                  <Plus size={14} /> Add another contact
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Shop Name *</label>
              <div className="flex gap-2">
                <input
                  className={inputBase + " text-lg"}
                  value={form.shopName}
                  onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  placeholder="e.g. Maa Ice Cream Store"
                  required
                />
                <span className="inline-flex items-center px-3 rounded-lg bg-gray-100 text-gray-600">
                  <Building size={18} />
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Shop Address *</label>
              <input
                className={inputBase + " text-base"}
                value={form.shopAddress}
                onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
                placeholder="Full shop address"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Latitude (optional)</label>
              <input
                className={inputBase}
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="e.g. 21.1458"
                type="number"
                step="any"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Longitude (optional)</label>
              <input
                className={inputBase}
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                placeholder="e.g. 72.7758"
                type="number"
                step="any"
              />
            </div>

            {/* editable numeric fields when editing; read-only when creating */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Credit</label>
              <input
                className={inputBase}
                value={form.credit}
                onChange={(e) => setForm({ ...form, credit: e.target.value.replace(/[^\d.-]/g, "") })}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                readOnly={!editingId}
              />
              <p className="text-xs text-gray-400 mt-1">{editingId ? "You can update credit value." : "Starts at 0 (editable after creation)."}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Debit</label>
              <input
                className={inputBase}
                value={form.debit}
                onChange={(e) => setForm({ ...form, debit: e.target.value.replace(/[^\d.-]/g, "") })}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                readOnly={!editingId}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Total Sales</label>
              <input
                className={inputBase}
                value={form.totalSales}
                onChange={(e) => setForm({ ...form, totalSales: e.target.value.replace(/[^\d.-]/g, "") })}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                readOnly={!editingId}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Remarks</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                rows={3}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Optional remarks (e.g. moved to other supplier)"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: "",
                      contacts: [""],
                      shopName: "",
                      shopAddress: "",
                      latitude: "",
                      longitude: "",
                      remarks: "",
                      credit: "0",
                      debit: "0",
                      totalSales: "0",
                    });
                    setShowForm(false);
                  }}
                  className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
                >
                  Cancel Edit
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className={`inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg ${saving ? "opacity-70" : ""}`}
              >
                <FileText size={16} /> <span className="font-medium">{editingId ? "Update Customer" : "Save Customer"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Customers list */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Customer List</h2>
            <div className="text-sm text-gray-500">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-left">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
                  <th className="p-3 border-b">ID</th>
                  <th className="p-3 border-b">Name</th>
                  <th className="p-3 border-b">Primary Contact</th>
                  <th className="p-3 border-b">Shop</th>
                  <th className="p-3 border-b">Location</th>
                  <th className="p-3 border-b">Credit</th>
                  <th className="p-3 border-b">Debit</th>
                  <th className="p-3 border-b">Total Sales</th>
                  <th className="p-3 border-b">Remarks</th>
                  <th className="p-3 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-gray-500">No customers found.</td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="p-3 align-top text-sm text-gray-700 font-mono">{c._id.slice(-8)}</td>
                      <td className="p-3 align-top text-base text-gray-800 font-semibold">{c.name}</td>
                      <td className="p-3 align-top text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Phone size={16} />
                          <div>
                            <div className="font-medium">{c.contacts?.[0] || "-"}</div>
                            {c.contacts?.length > 1 && <div className="text-xs text-gray-500">+{c.contacts.length - 1} more</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 align-top text-sm text-gray-700">{c.shopName}</td>
                      <td className="p-3 align-top text-sm text-gray-700">
                        {c.location?.latitude && c.location?.longitude ? (
                          <div className="flex items-center gap-2">
                            <MapPin size={16} /> <span>{`${c.location.latitude}, ${c.location.longitude}`}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3 align-top text-sm text-gray-700">{formatCurrency(c.credit)}</td>
                      <td className="p-3 align-top text-sm text-gray-700">{formatCurrency(c.debit)}</td>
                      <td className="p-3 align-top text-sm text-gray-700">{formatCurrency(c.totalSales)}</td>
                      <td className="p-3 align-top text-sm text-gray-700">{c.remarks || "-"}</td>
                      <td className="p-3 align-top text-sm text-gray-700">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(c)}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                            title="View"
                          >
                            <Eye size={16} /> View
                          </button>

                          <button
                            onClick={() => handleEdit(c)}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                            title="Edit"
                          >
                            <Edit3 size={16} /> Edit
                          </button>

                          <button
                            onClick={() => openDeleteModal(c._id)}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

     {/* VIEW Modal */}
{viewingCustomer && (
  <CustomerViewModal
    customer={viewingCustomer}
    onClose={() => setViewingCustomer(null)}
    onEdit={(c) => {
      setViewingCustomer(null);
      handleEdit(c);
    }}
    onDelete={(id) => {
      setViewingCustomer(null);
      openDeleteModal(id);
    }}
  />
)}



      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800">Delete customer?</h3>
            <p className="text-sm text-gray-500 mt-2">This action cannot be undone. Are you sure you want to delete this customer?</p>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={cancelDelete} className="px-4 py-2 rounded border text-gray-700">Cancel</button>
              <button onClick={performDelete} disabled={deleting} className={`px-4 py-2 rounded bg-red-600 text-white ${deleting ? "opacity-70" : ""}`}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
