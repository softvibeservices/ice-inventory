// icecream-inventory/src/app/dashboard/products/page.tsx



"use client";

import React, { JSX, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import ProductList from "./ProductList";
import ProductForm from "./ProductForm";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { Product, FormState, SortMode } from "@/types/product.type";

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
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const initialForm: FormState = {
    name: "",
    category: "",
    unit: "piece",
    packQuantity: "",
    packUnit: "",
    sellingPrice: "",
    mrp: "",
    quantity: "",
    minStock: "",
    notes: "",
  };
  const [formData, setFormData] = useState<FormState>(initialForm);

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
  }, [userId]);

  const validateAndBuildPayload = (): {
    error?: string;
    payload?: Partial<Product>;
  } => {
    const sellingPrice =
      formData.sellingPrice !== "" ? Number(formData.sellingPrice) : NaN;
    const quantity =
      formData.quantity !== "" ? Number(formData.quantity) : undefined;
    const mrp = formData.mrp !== "" ? Number(formData.mrp) : undefined;
    const minStock =
      formData.minStock !== "" ? Number(formData.minStock) : undefined;
    const packQuantity =
      formData.packQuantity !== ""
        ? Number(formData.packQuantity)
        : undefined;

    if (!formData.name.trim()) return { error: "Name is required" };
    if (!formData.unit) return { error: "Unit is required" };
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
      sellingPrice: Number(formData.sellingPrice),
      mrp,
      quantity,
      minStock,
      notes: formData.notes?.trim() || undefined,
      userId: userId ?? undefined,
    };

    return { payload };
  };

  const cleanPayload = (p: Partial<Product>) =>
    Object.fromEntries(
      Object.entries(p).filter(([_, v]) => v !== undefined && v !== "")
    );

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
        const cleaned = cleanPayload(payload);
        body = { ...cleaned, id: editingId, userId };
      } else {
        body = { ...payload, userId };
      }

      const res = await fetch("/api/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `${method} failed`);
      }

      const result = await res.json().catch(() => null);

      if (editingId) {
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
        if (result && result._id) {
          setProducts((prev) => [result, ...prev]);
        } else {
          await fetchProducts();
        }
        toast.success("Product added!");
      }

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

  const handleEdit = (p: Product) => {
    setEditingId(p._id ?? null);
    setFormData({
      name: p.name ?? "",
      category: p.category ?? "",
      unit: p.unit ?? "piece",
      packQuantity: p.packQuantity !== undefined ? String(p.packQuantity) : "",
      packUnit: p.packUnit ?? "",
      sellingPrice: p.sellingPrice !== undefined ? String(p.sellingPrice) : "",
      mrp: p.mrp !== undefined ? String(p.mrp) : "",
      quantity: p.quantity !== undefined ? String(p.quantity) : "",
      minStock: p.minStock !== undefined ? String(p.minStock) : "",
      notes: p.notes ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setFormData(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <DashboardNavbar />
  
      <main className="flex-grow w-full">
        {/* Page Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Products
              </h1>
              <p className="text-sm text-gray-500">
                Manage your shop&apos;s products
              </p>
            </div>
  
            <div className="flex flex-wrap gap-3">
              
  
              <button
                onClick={() => {
                  setShowForm((s) => !s);
                  if (!showForm) {
                    setEditingId(null);
                    setFormData(initialForm);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
              >
                {showForm ? "Close Form" : "+ Add Product"}
              </button>
            </div>
          </div>
  
          {/* Product Form */}
          {showForm && (
            <div className="mb-8">
              <ProductForm
                formData={formData}
                setFormData={setFormData}
                handleSubmit={handleSubmit}
                cancelEdit={cancelEdit}
                isSubmitting={isSubmitting}
                editingId={editingId}
              />
            </div>
          )}
  
          {/* Product List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <ProductList
              products={products}
              loading={loading}
              search={search}
              sortMode={sortMode}
              setSearch={setSearch}
              setSortMode={setSortMode}
              handleEdit={handleEdit}
              setConfirmDeleteId={setConfirmDeleteId}
              fetchProducts={fetchProducts}
            />
          </div>
        </div>
  
        {/* Delete Modal */}
        <DeleteConfirmationModal
          confirmDeleteId={confirmDeleteId}
          setConfirmDeleteId={setConfirmDeleteId}
          handleDeleteConfirmed={handleDeleteConfirmed}
          isDeleting={isDeleting}
        />
  
        <Toaster position="top-right" reverseOrder={false} />
      </main>
  
      <Footer />
    </div>
  );
  
}
