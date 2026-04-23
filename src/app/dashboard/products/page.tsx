// src/app/dashboard/products/page.tsx
"use client";

import React, { JSX, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Upload, FileText, Plus, Package, Lock } from "lucide-react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import PlanLimitWarning from "@/app/components/PlanLimitWarning";
import UpgradePromptModal from "@/app/components/UpgradePromptModal";
import ProductList from "./ProductList";
import ProductForm from "./ProductForm";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import CSVFormatModal from "./CSVFormatModal";
import BulkUploadModal from "./BulkUploadModal";
import { Product, FormState, SortMode } from "@/types/product.type";
import { useSubscription } from "@/hooks/useSubscription";

export default function ProductsPage(): JSX.Element {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [showCSVFormat, setShowCSVFormat] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // ── Subscription state ────────────────────────────────────────────────────
  const { subscription } = useSubscription();
  const [upgradeModal, setUpgradeModal] = useState(false);

  //  Derived limit values from the live subscription
  const productLimit   = subscription?.effectiveLimits.products   ?? null;
  const productCount   = products.length;
  const isAtLimit      = productLimit !== null && productCount >= productLimit;
  // ─────────────────────────────────────────────────────────────────────────

  const initialForm: FormState = {
    name: "",
    category: "",
    unit: "",
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
        if (parsed?._id) setUserId(String(parsed._id));
      } catch (error) {
        console.error("Error parsing user:", error);
      }
    }
  }, []);

  const fetchProducts = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      formData.packQuantity !== "" ? Number(formData.packQuantity) : undefined;

    if (!formData.name.trim()) return { error: "Name is required" };
    if (!formData.category?.trim()) return { error: "Category is required" };
    if (!formData.unit) return { error: "Unit is required" };
    if (!Number.isFinite(sellingPrice))
      return { error: "Valid selling price is required" };
    if (quantity !== undefined && !Number.isFinite(quantity))
      return { error: "Invalid quantity" };

    const payload: Partial<Product> = {
      name: formData.name.trim(),
      category: formData.category?.trim(),
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
      Object.entries(p).filter(([, v]) => v !== undefined && v !== "")
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
      let body: Record<string, unknown>;
      if (editingId) {
        const cleaned = cleanPayload(payload);
        body = { ...cleaned, id: editingId, userId };
      } else {
        body = { ...payload, userId };
      }

      const token = localStorage.getItem("token");
      const res = await fetch("/api/products", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));

        // Handle product limit 403
        if (res.status === 403 && err?.upgradeRequired) {
          setUpgradeModal(true);
          return;
        }

        throw new Error(err?.error || `${method} failed`);
      }

      const result = await res.json().catch(() => null);

      if (editingId) {
        if (result?._id) {
          setProducts((prev) => prev.map((p) => (p._id === editingId ? result : p)));
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
        if (result?._id) {
          setProducts((prev) => [result, ...prev]);
        } else {
          await fetchProducts();
        }
        toast.success("Product added!");
      }

      setFormData(initialForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (p: Product) => {
    setEditingId(p._id ?? null);
    setFormData({
      name: p.name ?? "",
      category: p.category ?? "",
      unit: p.unit ?? "",
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
      const token = localStorage.getItem("token");
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: confirmDeleteId }),
      });

      if (!res.ok) throw new Error("Delete failed");
      setProducts((prev) => prev.filter((p) => p._id !== confirmDeleteId));
      setConfirmDeleteId(null);
      toast.success("Product deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading your account…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <DashboardNavbar />

      <main className="flex-grow w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

          {/* Plan limit warning */}
          {subscription && (
            <PlanLimitWarning
              productsCount={productCount}
              productsLimit={productLimit}
              planId={subscription.planId}
            />
          )}

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <Package size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">Products</h1>
                <p className="text-sm text-gray-500">
                  {productLimit !== null
                    ? `${productCount} / ${productLimit} products used`
                    : "Manage your shop's product catalogue"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              {/* ── Upload Guide button (replaces "CSV Format") ── */}
              {/* Renamed from "CSV Format" to "Upload Guide" since the modal
                  covers both CSV and Excel templates — the old label was misleading */}
              <button
                onClick={() => setShowCSVFormat(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                           border border-gray-200 rounded-lg text-gray-600 bg-white
                           hover:bg-gray-50 transition-colors shadow-sm"
              >
                <FileText size={15} />
                Upload Guide
              </button>

              {/* ── Bulk Upload — disabled + tooltip when at limit ── */}
              {isAtLimit ? (
                <button
                  onClick={() => setUpgradeModal(true)}
                  title={`Product limit reached (${productCount}/${productLimit}). Upgrade your plan to bulk upload more products.`}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold
                             border border-gray-200 rounded-lg text-gray-400 bg-gray-100
                             cursor-not-allowed shadow-sm"
                >
                  <Lock size={15} />
                  Bulk Upload
                </button>
              ) : (
                <button
                  onClick={() => setShowBulkUpload(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold
                             border border-blue-200 rounded-lg text-blue-700 bg-blue-50
                             hover:bg-blue-100 transition-colors shadow-sm"
                >
                  <Upload size={15} />
                  Bulk Upload
                </button>
              )}

              {/* ── Add Product — disabled + tooltip when at limit ── */}
              {isAtLimit ? (
                <button
                  onClick={() => setUpgradeModal(true)}
                  title={`Product limit reached (${productCount}/${productLimit}). Upgrade your plan to add more.`}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg
                             shadow-sm bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                >
                  <Lock size={15} />
                  Add Product
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!showForm) {
                      setEditingId(null);
                      setFormData(initialForm);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                    setShowForm((s) => !s);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg
                              shadow-sm transition-all ${
                    showForm
                      ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <Plus size={15} />
                  {showForm ? "Hide Form" : "Add Product"}
                </button>
              )}
            </div>
          </div>

          {/* Product Form (collapsible) */}
          {showForm && !isAtLimit && (
            <ProductForm
              formData={formData}
              setFormData={setFormData}
              handleSubmit={handleSubmit}
              cancelEdit={cancelEdit}
              isSubmitting={isSubmitting}
              editingId={editingId}
              userId={userId}
            />
          )}

          {/* Product List */}
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
      </main>

      {/* Modals */}
      <DeleteConfirmationModal
        confirmDeleteId={confirmDeleteId}
        setConfirmDeleteId={setConfirmDeleteId}
        handleDeleteConfirmed={handleDeleteConfirmed}
        isDeleting={isDeleting}
      />

      {showCSVFormat && <CSVFormatModal onClose={() => setShowCSVFormat(false)} />}

      {showBulkUpload && (
        <BulkUploadModal
          userId={userId}
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => fetchProducts()}
        />
      )}

      {/* Upgrade prompt modal */}
      <UpgradePromptModal
        open={upgradeModal}
        onClose={() => setUpgradeModal(false)}
        resource="product"
        used={productCount}
        limit={productLimit}
        currentPlanId={subscription?.planId}
      />

      <Toaster position="top-right" reverseOrder={false} />
      <Footer />
    </div>
  );
}