// src/app/dashboard/customers/CustomerForm.tsx
"use client";

import { Plus, Trash2, Phone, Building } from "lucide-react";
import { FormState } from "@/types/customer.type";

interface CustomerFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  showForm: boolean;
  saving: boolean;
  editingId: string | null;
  handleSubmit: (e: React.FormEvent) => void;
  onCancel: () => void; 
}

export default function CustomerForm({
  form,
  setForm,
  showForm,
  saving,
  editingId,
  handleSubmit,
  onCancel, 
}: CustomerFormProps) {
  const inputBase =
    "w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const addContactField = () =>
    setForm((f) => ({ ...f, contacts: [...f.contacts, ""] }));
  const removeContactField = (index: number) => {
    if (index === 0) return;
    setForm((f) => ({
      ...f,
      contacts: f.contacts.filter((_, i) => i !== index),
    }));
  };
  const updateContact = (index: number, value: string) => {
    const c = [...form.contacts];
    c[index] = value;
    setForm((f) => ({ ...f, contacts: c }));
  };

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ${
        showForm ? "max-h-[1600px] mb-6" : "max-h-0"
      }`}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-5 sm:px-6"
      >
        {/* ================= HEADER ================= */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            {editingId ? "Edit Customer" : "Add New Customer"}
          </h2>
          <p className="text-sm text-slate-700">
            Fields marked with * are required
          </p>
        </div>
  
        {/* ================= GRID ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
  
          {/* Customer Name */}
          <div>
            <label className="text-sm font-semibold text-slate-800">
              Customer Name *
            </label>
            <input
              className={inputBase}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ramesh & Sons"
              required
            />
          </div>
  
          {/* Primary Contact */}
          <div>
            <label className="text-sm font-semibold text-slate-800">
              Primary Contact *
            </label>
            <div className="flex gap-2">
              <input
                className={inputBase}
                value={form.contacts[0]}
                onChange={(e) => updateContact(0, e.target.value)}
                placeholder="9876543210"
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
              <span className="flex items-center px-3 rounded-lg bg-slate-100 text-slate-600">
                <Phone size={16} />
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Digits only (6–15)
            </p>
          </div>
  
          {/* Shop Name */}
          <div>
            <label className="text-sm font-semibold text-slate-800">
              Shop Name *
            </label>
            <div className="flex gap-2">
              <input
                className={inputBase}
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                placeholder="Maa Ice Cream Store"
                required
              />
              <span className="flex items-center px-3 rounded-lg bg-slate-100 text-slate-600">
                <Building size={16} />
              </span>
            </div>
          </div>
  
          {/* Shop Address */}
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-slate-800">
              Shop Address *
            </label>
            <input
              className={inputBase}
              value={form.shopAddress}
              onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
              placeholder="Full shop address"
              required
            />
          </div>
  
          {/* Area */}
          <div>
            <label className="text-sm font-semibold text-slate-800">
              Area *
            </label>
            <input
              className={inputBase}
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              placeholder="City / Area"
              required
            />
          </div>
  
          {/* Latitude */}
          <div>
            <label className="text-sm font-semibold text-slate-800">
              Latitude
            </label>
            <input
              className={inputBase}
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              type="number"
              step="any"
              placeholder="21.1458"
            />
          </div>
  
          {/* Longitude */}
          <div>
            <label className="text-sm font-semibold text-slate-800">
              Longitude
            </label>
            <input
              className={inputBase}
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              type="number"
              step="any"
              placeholder="72.7758"
            />
          </div>
  
          {/* Credit */}
          <div>
            <label className="text-sm font-semibold text-slate-800">
              Credit
            </label>
            <input
              className={inputBase}
              value={form.credit}
              readOnly={!editingId}
              onChange={(e) =>
                setForm({
                  ...form,
                  credit: e.target.value.replace(/[^\d.-]/g, ""),
                })
              }
              placeholder="0.00"
            />
          </div>
  
          {/* Debit */}
          <div>
            <label className="text-sm font-semibold text-slate-800">
              Debit
            </label>
            <input
              className={inputBase}
              value={form.debit}
              readOnly={!editingId}
              onChange={(e) =>
                setForm({
                  ...form,
                  debit: e.target.value.replace(/[^\d.-]/g, ""),
                })
              }
              placeholder="0.00"
            />
          </div>
  
          {/* Total Sales */}
          <div>
            <label className="text-sm font-semibold text-slate-800">
              Total Sales
            </label>
            <input
              className={inputBase}
              value={form.totalSales}
              readOnly={!editingId}
              onChange={(e) =>
                setForm({
                  ...form,
                  totalSales: e.target.value.replace(/[^\d.-]/g, ""),
                })
              }
              placeholder="0.00"
            />
          </div>
  
          {/* ================= ADDITIONAL CONTACTS ================= */}
          <div className="sm:col-span-2 xl:col-span-3">
            <label className="text-sm font-semibold text-slate-800">
              Additional Contacts
            </label>
  
            <div className="mt-2 space-y-2">
              {form.contacts.map((c, i) => {
                if (i === 0) return null;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className={inputBase}
                      value={c}
                      onChange={(e) => updateContact(i, e.target.value)}
                      placeholder="Additional contact"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                    <button
                      type="button"
                      onClick={() => removeContactField(i)}
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
  
              <button
                type="button"
                onClick={addContactField}
                className="inline-flex items-center gap-2 text-blue-700 font-medium text-sm hover:underline"
              >
                <Plus size={14} /> Add another contact
              </button>
            </div>
          </div>
  
          {/* Remarks */}
          <div className="sm:col-span-2 xl:col-span-3">
            <label className="text-sm font-semibold text-slate-800">
              Remarks
            </label>
            <textarea
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-600"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional remarks"
            />
          </div>
        </div>
  
        {/* ================= ACTIONS ================= */}
        <div className="mt-5 flex justify-end gap-3">
          {editingId && (
            <button
            onClick={onCancel}
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
  
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 ${
              saving ? "opacity-70" : ""
            }`}
          >
            {editingId ? "Update Customer" : "Save Customer"}
          </button>
        </div>
      </form>
    </div>
  );
  
}
