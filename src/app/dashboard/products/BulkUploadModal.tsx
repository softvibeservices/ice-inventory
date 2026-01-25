// src/app/dashboard/products/BulkUploadModal.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, AlertCircle, CheckCircle, FileSpreadsheet } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import BulkProductRow, { BulkProduct } from "./BulkProductRow";

interface BulkUploadModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({
  userId,
  onClose,
  onSuccess,
}: BulkUploadModalProps) {
  const [products, setProducts] = useState<BulkProduct[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories and units from backend
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoadingSettings(true);
        const res = await fetch(`/api/user-settings?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        
        if (res.ok) {
          setCategories(data.categories || []);
          setUnits(data.units || []);
        } else {
          toast.error("Failed to load categories and units");
        }
      } catch (error) {
        toast.error("Failed to load settings");
      } finally {
        setLoadingSettings(false);
      }
    };

    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith(".csv");
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    if (!isCSV && !isExcel) {
      toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
      return;
    }

    setUploading(true);

    if (isCSV) {
      parseCSV(file);
    } else {
      parseExcel(file);
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processUploadedData(results.data);
        setUploading(false);
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        toast.error("Failed to read CSV file");
        setUploading(false);
      },
    });
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        processUploadedData(jsonData);
        setUploading(false);
      } catch (error) {
        console.error("Excel parsing error:", error);
        toast.error("Failed to read Excel file");
        setUploading(false);
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read Excel file");
      setUploading(false);
    };

    reader.readAsBinaryString(file);
  };

  const processUploadedData = (data: any[]) => {
    try {
      const parsedProducts = data.map((row: any, index: number) => {
        // Parse row to BulkProduct
        const name = row["Product Name"]?.toString().trim() || "";
        const category = row["Category"]?.toString().trim() || "";
        const unit = row["Unit"]?.toString().trim() || "";
        const packQuantity = row["Pack Quantity"]?.toString().trim() || "";
        const packUnit = row["Pack Unit"]?.toString().trim() || "";
        const sellingPrice = row["Selling Price"]?.toString().trim() || "";
        const mrp = row["MRP"]?.toString().trim() || "";
        const quantity = row["Stock Quantity"]?.toString().trim() || "";
        const minStock = row["Minimum Stock"]?.toString().trim() || "";
        const notes = row["Notes"]?.toString().trim() || "";

        // Match category (case-insensitive)
        const matchedCategory =
          categories.find(
            (c) => c.toLowerCase() === category.toLowerCase()
          ) || "";

        // Match unit (case-insensitive)
        const matchedUnit =
          units.find((u) => u.toLowerCase() === unit.toLowerCase()) || "";

        // Match pack unit (case-insensitive)
        const matchedPackUnit = packUnit
          ? units.find((u) => u.toLowerCase() === packUnit.toLowerCase()) || ""
          : "";

        const product: BulkProduct = {
          id: `bulk-${Date.now()}-${index}`,
          name,
          category: matchedCategory,
          unit: matchedUnit,
          packQuantity,
          packUnit: matchedPackUnit,
          sellingPrice,
          mrp,
          quantity,
          minStock,
          notes,
        };

        // Validate
        product.errors = validateProduct(product);

        return product;
      });

      setProducts(parsedProducts);
      toast.success(`${parsedProducts.length} products loaded successfully! ✅`);
    } catch (error) {
      console.error("Data processing error:", error);
      toast.error("Failed to process file data");
    }
  };

  const validateProduct = (product: BulkProduct): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!product.name) {
      errors.name = "Required";
    }

    // ✅ Category is now REQUIRED
    if (!product.category) {
      errors.category = "Required - must match your settings";
    }

    if (!product.unit) {
      errors.unit = "Required - must match your settings";
    }

    const price = Number(product.sellingPrice);
    if (!product.sellingPrice || isNaN(price) || price <= 0) {
      errors.sellingPrice = "Must be > 0";
    }

    const qty = Number(product.quantity);
    if (product.quantity === "" || isNaN(qty) || qty < 0) {
      errors.quantity = "Must be ≥ 0";
    }

    return errors;
  };

  const handleProductChange = (
    index: number,
    field: keyof BulkProduct,
    value: string
  ) => {
    setProducts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Re-validate
      updated[index].errors = validateProduct(updated[index]);
      return updated;
    });
  };

  const handleRemoveProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    // Final validation
    const validProducts = products.filter(
      (p) => !p.errors || Object.keys(p.errors).length === 0
    );

    if (validProducts.length === 0) {
      toast.error("No valid products to save");
      return;
    }

    if (validProducts.length < products.length) {
      toast.error(
        `${products.length - validProducts.length} products have errors. Please fix them first.`
      );
      return;
    }

    setSaving(true);

    try {
      // Prepare payload
      const payload = validProducts.map((p) => ({
        userId,
        name: p.name,
        category: p.category, // ✅ Now required
        unit: p.unit,
        packQuantity: p.packQuantity ? Number(p.packQuantity) : undefined,
        packUnit: p.packUnit || undefined,
        sellingPrice: Number(p.sellingPrice),
        mrp: p.mrp ? Number(p.mrp) : undefined,
        quantity: Number(p.quantity),
        minStock: p.minStock ? Number(p.minStock) : undefined,
        notes: p.notes || undefined,
      }));

      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save products");
      }

      toast.success(`✅ ${validProducts.length} products saved successfully!`, {
        duration: 4000,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Bulk save error:", error);
      toast.error(error.message || "Failed to save products");
    } finally {
      setSaving(false);
    }
  };

  const errorCount = products.filter(
    (p) => p.errors && Object.keys(p.errors).length > 0
  ).length;

  if (loadingSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading categories and units...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              Bulk Upload Products
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Upload CSV or Excel file, review & edit, then save all
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {products.length === 0 ? (
            // Upload Section
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-400 rounded-2xl p-12 max-w-lg w-full text-center">
                <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  Upload Your File
                </h4>
                <p className="text-base text-gray-700 mb-6">
                  Select a CSV or Excel file containing your products
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Loading..." : "Choose File"}
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Supports: CSV, XLSX, XLS
                </p>
              </div>
            </div>
          ) : (
            // Review Section
            <div className="space-y-4">
              {/* Stats Bar */}
              <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-xl px-6 py-4 shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-base font-bold text-gray-900">
                      {products.length - errorCount} Valid
                    </span>
                  </div>
                  {errorCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                      <span className="text-base font-bold text-red-700">
                        {errorCount} Errors
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setProducts([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="text-base text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  Upload Different File
                </button>
              </div>

              {/* Product Cards */}
              <div className="space-y-4">
                {products.map((product, index) => (
                  <BulkProductRow
                    key={product.id}
                    product={product}
                    index={index}
                    categories={categories}
                    units={units}
                    onChange={handleProductChange}
                    onRemove={handleRemoveProduct}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {products.length > 0 && (
          <div className="flex items-center justify-between px-6 py-5 border-t border-gray-200 bg-gray-50">
            <div className="text-base font-medium">
              {errorCount > 0 ? (
                <span className="text-red-700">
                  ❌ Fix {errorCount} product{errorCount > 1 ? "s" : ""} before saving
                </span>
              ) : (
                <span className="text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  All products are valid
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving || errorCount > 0}
                className="px-8 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {saving ? "Saving..." : `Save All (${products.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}