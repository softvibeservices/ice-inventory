// icecream-inventory/src/app/dashboard/products/page.tsx

"use client";

import React, { JSX, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { useRouter } from "next/navigation"; 

interface Product {
  _id?: string;
  userId?: string;
  name: string;
  category?: string;
  unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
  packQuantity?: number;
  packUnit?: string;
  purchasePrice?: number;
  sellingPrice: number;
  mrp?: number;
  quantity?: number;
  minStock?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

type FormState = {
  name: string;
  category: string;
  unit: Product["unit"];
  packQuantity: string;
  packUnit: string;
  purchasePrice: string;
  sellingPrice: string;
  mrp: string;
  quantity: string;
  minStock: string;
  notes: string;
};

export default function ProductsPage(): JSX.Element {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialForm: FormState = {
    name: "",
    category: "",
    unit: "piece",
    packQuantity: "",
    packUnit: "",
    purchasePrice: "",
    sellingPrice: "",
    mrp: "",
    quantity: "",
    minStock: "",
    notes: "",
  };
  const [formData, setFormData] = useState<FormState>(initialForm);

  // Load userId from localStorage (or session) — adjust per your auth flow
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Fetch products for current user
  const fetchProducts = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/products?userId=${encodeURIComponent(userId)}`
      );
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Build payload and validate
  const validateAndBuildPayload = (): {
    error?: string;
    payload?: Partial<Product>;
  } => {
    const purchasePrice =
      formData.purchasePrice !== ""
        ? Number(formData.purchasePrice)
        : undefined;
    const sellingPrice =
      formData.sellingPrice !== "" ? Number(formData.sellingPrice) : NaN;
    const quantity =
      formData.quantity !== "" ? Number(formData.quantity) : undefined;
    const mrp = formData.mrp !== "" ? Number(formData.mrp) : undefined;
    const minStock =
      formData.minStock !== "" ? Number(formData.minStock) : undefined;
    const packQuantity =
      formData.packQuantity !== "" ? Number(formData.packQuantity) : undefined;

    if (!formData.name.trim()) return { error: "Name is required" };
    if (!formData.unit) return { error: "Unit is required" };
    if (purchasePrice !== undefined && !Number.isFinite(purchasePrice))
      return { error: "Invalid purchase price" };
    if (!Number.isFinite(sellingPrice))
      return { error: "Valid selling price is required" };
    if (quantity !== undefined && !Number.isFinite(quantity))
      return { error: "Invalid quantity" };

    const payload: Partial<Product> = {
      name: formData.name.trim(),
      category: formData.category?.trim() || undefined,
      unit: formData.unit,
      packQuantity,
      packUnit: formData.packUnit?.trim() || undefined,
      purchasePrice: purchasePrice === undefined ? undefined : purchasePrice,
      sellingPrice: Number(formData.sellingPrice),
      mrp,
      quantity,
      minStock,
      notes: formData.notes?.trim() || undefined,
      userId: userId ?? undefined,
    };

    return { payload };
  };

  // Remove undefined keys so PUT only sets provided fields
  const cleanPayload = (p: Partial<Product>) =>
    Object.fromEntries(
      Object.entries(p).filter(([_, v]) => v !== undefined && v !== "")
    );

  // Submit create or update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }

    const check = validateAndBuildPayload();
    if (check.error) {
      toast.error(check.error);
      return;
    }
    const payload = check.payload!;

    setIsSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      let body: any;
      if (editingId) {
        // Only send changed/defined fields for update
        const cleaned = cleanPayload(payload);
        body = { ...cleaned, id: editingId, userId };
      } else {
        // For create, ensure mandatory numeric fields exist and are numbers
        body = { ...payload, userId };
      }

      const res = await fetch("/api/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // try to show server error
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `${method} failed`);
      }

      const result = await res.json().catch(() => null);

      if (editingId) {
        // Update local list (use server's returned item if available)
        if (result && result._id) {
          setProducts((prev) =>
            prev.map((p) => (p._id === editingId ? result : p))
          );
        } else {
          setProducts((prev) =>
            prev.map((p) =>
              p._id === editingId
                ? { ...(p as Product), ...(payload as Product), _id: editingId }
                : p
            )
          );
        }
        toast.success("Product updated!");
      } else {
        // create: prepend new item (server ideally returns created item)
        if (result && result._id) {
          setProducts((prev) => [result, ...prev]);
        } else {
          await fetchProducts();
        }
        toast.success("Product added!");
      }

      // reset form
      setFormData(initialForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Save failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prefill form for editing
  const handleEdit = (p: Product) => {
    setEditingId(p._id ?? null);
    setFormData({
      name: p.name ?? "",
      category: p.category ?? "",
      unit: p.unit ?? "piece",
      packQuantity: p.packQuantity !== undefined ? String(p.packQuantity) : "",
      packUnit: p.packUnit ?? "",
      purchasePrice:
        p.purchasePrice !== undefined ? String(p.purchasePrice) : "",
      sellingPrice: p.sellingPrice !== undefined ? String(p.sellingPrice) : "",
      mrp: p.mrp !== undefined ? String(p.mrp) : "",
      quantity: p.quantity !== undefined ? String(p.quantity) : "",
      minStock: p.minStock !== undefined ? String(p.minStock) : "",
      notes: p.notes ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cancel editing / reset
  const cancelEdit = () => {
    setFormData(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  // Delete product
  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteId || !userId) return;
    try {
      setIsDeleting(true);
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: confirmDeleteId, userId }),
      });

      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p._id !== confirmDeleteId));
        toast.success("Product deleted!");
      } else {
        toast.error("Delete failed on server");
      }
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const exportPDF = () => {
    if (filtered.length === 0) {
      toast.error("No products to export");
      return;
    }


    const doc = new jsPDF("p", "pt");
  
    // Format date as DD/MM/YYYY
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
  
    // Title
    doc.setFontSize(14);
    doc.text("Products Report", 40, 40);
    doc.setFontSize(10);
    doc.text(`Generated on: ${formattedDate}`, 40, 60);
  
    // Define table headers
    const headers = [
      ["Name", "Category", "Unit", "Pack Qty", "Pack Unit", "Selling Price", "MRP"]
    ];
  
    // Map product data (no ₹, only numbers)
    const data = filtered.map((p) => [
      p.name,
      p.category || "-",
      p.unit,
      renderPackQuantity(p),
      renderPackUnit(p),
      p.sellingPrice ? `${p.sellingPrice}` : "-",
      p.mrp ? `${p.mrp}` : "-"
    ]);
  
    autoTable(doc, {
      startY: 80,
      head: headers,
      body: data,
      styles: { halign: "center", font: "helvetica" },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, halign: "center" },
    });
  
    // Save with date in filename
    doc.save(`products-${day}-${month}-${year}.pdf`);
  };
  
  
  
  


  // Filtered list by search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const formatCurrency = (v?: number) =>
    typeof v === "number" ? `₹${v.toFixed(2)}` : "-";

  // small helper to render pack fields separately
  const renderPackQuantity = (p: Product) =>
    p.packQuantity !== undefined && p.packQuantity !== null
      ? String(p.packQuantity)
      : "-";
  const renderPackUnit = (p: Product) => (p.packUnit ? p.packUnit : "-");

  // If user is not signed in — prompt
  if (!userId) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-800">Not signed in</h2>
          <p className="text-sm text-gray-600 mt-2">
            You need to be signed in to manage products. Please log in first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <DashboardNavbar/>
      

      <main className="flex-grow mt-6">
      {/* Header */}
      
      <div className="m-4 flex justify-between items-center">
  <button
    onClick={() => router.push("/dashboard")}
    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow"
  >
    Back to Home
  </button>

  {filtered.length === 0 ? (
  // ❌ No Products Button
  <button
    disabled
    className="flex items-center gap-2 bg-gray-300 text-gray-600 font-medium px-5 py-2.5 rounded-xl shadow cursor-not-allowed"
  >
    <svg xmlns="http://www.w3.org/2000/svg" 
         className="w-6 h-6" 
         fill="currentColor" 
         viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 14a1 1 0 011-1h3v2H5a1 1 0 01-1-1zm9-2v3a1 1 0 01-1 1H9v-4h3zm2-1h-1v4h1a1 1 0 001-1v-3a1 1 0 00-1-1zm-3-4a1 1 0 00-2 0v4.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3c.39.39 1.024.39 1.414 0l3-3a1 1 0 10-1.414-1.414L11 11.586V7z" clipRule="evenodd" />
    </svg>
    No Products to Export
  </button>
) : (
  // ✅ Active Export Button
  <button
    onClick={exportPDF}
    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg transition-all duration-300 ease-in-out"
  >
    <svg xmlns="http://www.w3.org/2000/svg" 
         className="w-6 h-6" 
         fill="currentColor" 
         viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 14a1 1 0 011-1h3v2H5a1 1 0 01-1-1zm9-2v3a1 1 0 01-1 1H9v-4h3zm2-1h-1v4h1a1 1 0 001-1v-3a1 1 0 00-1-1zm-3-4a1 1 0 00-2 0v4.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3c.39.39 1.024.39 1.414 0l3-3a1 1 0 10-1.414-1.414L11 11.586V7z" clipRule="evenodd" />
    </svg>
    Download Products Report
  </button>
)}

</div>




      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 m-12">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your shop's products
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            className="flex-1 md:flex-none w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={() => {
              setShowForm((s) => !s);
              if (!showForm) {
                setEditingId(null);
                setFormData(initialForm);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
          >
            {showForm ? "Close" : "Add Product"}
          </button>
          <button
            onClick={fetchProducts}
            className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50"
            title="Refresh"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Product name"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Category
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="e.g. Cone, Family Pack"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Unit *</label>
            <select
              value={formData.unit}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  unit: e.target.value as Product["unit"],
                })
              }
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="piece">piece</option>
              <option value="box">box</option>
              <option value="kg">kg</option>
              <option value="litre">litre</option>
              <option value="gm">gm</option>
              <option value="ml">ml</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Pack Quantity
            </label>
            <input
              type="number"
              min={0}
              value={formData.packQuantity}
              onChange={(e) =>
                setFormData({ ...formData, packQuantity: e.target.value })
              }
              placeholder="e.g. 6"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Pack Unit
            </label>
            <input
              type="text"
              value={formData.packUnit}
              onChange={(e) =>
                setFormData({ ...formData, packUnit: e.target.value })
              }
              placeholder="e.g. 1L, 90ml"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Purchase Price
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={formData.purchasePrice}
              onChange={(e) =>
                setFormData({ ...formData, purchasePrice: e.target.value })
              }
              placeholder="e.g. 50"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Selling Price *
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={formData.sellingPrice}
              onChange={(e) =>
                setFormData({ ...formData, sellingPrice: e.target.value })
              }
              placeholder="e.g. 70"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">MRP</label>
            <input
              type="number"
              min={0}
              step="any"
              value={formData.mrp}
              onChange={(e) =>
                setFormData({ ...formData, mrp: e.target.value })
              }
              placeholder="e.g. 80"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: e.target.value })
              }
              placeholder="e.g. 100"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Min Stock
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={formData.minStock}
              onChange={(e) =>
                setFormData({ ...formData, minStock: e.target.value })
              }
              placeholder="e.g. 10"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Optional notes..."
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 rounded-lg border text-gray-800"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow disabled:opacity-60"
            >
              {isSubmitting
                ? "Saving..."
                : editingId
                ? "Update Product"
                : "Save Product"}
            </button>
          </div>
        </form>
      )}

      {/* compact table showing requested columns */}
      <div className="overflow-x-auto bg-white rounded-lg p-4 shadow">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <strong>{filtered.length}</strong> product
            {filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        <table className="w-full table-auto border-collapse ">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
              <th className="p-3 border-b text-left">Name</th>
              <th className="p-3 border-b text-left">Category</th>
              <th className="p-3 border-b text-left">Unit</th>
              <th className="p-3 border-b text-left">Pack Quantity</th>
              <th className="p-3 border-b text-left">Pack Unit</th>
              <th className="p-3 border-b text-right text-gray-700">
                Selling Price
              </th>
              <th className="p-3 border-b text-right">MRP</th>
              <th className="p-3 border-b text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && products.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="p-3 border-b text-sm text-gray-800">
                    {p.name}
                  </td>
                  <td className="p-3 border-b text-sm text-gray-700">
                    {p.category || "-"}
                  </td>
                  <td className="p-3 border-b text-sm text-gray-700">
                    {p.unit}
                  </td>
                  <td className="p-3 border-b text-sm text-gray-700">
                    {renderPackQuantity(p)}
                  </td>
                  <td className="p-3 border-b text-sm text-gray-700">
                    {renderPackUnit(p)}
                  </td>
                  <td className="p-3 border-b text-sm text-right text-gray-700">
                    {formatCurrency(p.sellingPrice)}
                  </td>
                  <td className="p-3 border-b text-sm text-right text-gray-700">
                    {p.mrp ? formatCurrency(p.mrp) : "-"}
                  </td>
                  <td className="p-3 border-b text-sm">
                    <button
                      className="text-blue-600 hover:underline mr-3 "
                      onClick={() => handleEdit(p)}
                    >
                      Edit
                    </button>

                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => setConfirmDeleteId(p._id ?? null)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-800">
              Confirm Delete
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete this product? This action cannot
              be undone.
            </p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 disabled:opacity-60"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" reverseOrder={false} />

     

</main>

<Footer/>



    </div>
  );
}
