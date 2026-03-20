// src/app/dashboard/stocks/restock/BulkRestockModal.tsx
"use client";

import { useState, useRef } from "react";
import { X, Upload, AlertCircle, CheckCircle, FileSpreadsheet } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import BulkRestockRow, { BulkRestockItem } from "./BulkRestockRow";
import { Product } from "@/types/stocks.types";

interface BulkRestockModalProps {
  userId: string;
  products: Product[];
  globalNote: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkRestockModal({
  userId,
  products,
  globalNote,
  onClose,
  onSuccess,
}: BulkRestockModalProps) {
  const [items, setItems] = useState<BulkRestockItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localNote, setLocalNote] = useState(globalNote);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      error: () => {
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
      } catch {
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
      const parsedItems = data.map((row: any, index: number) => {
        const productName = row["Product Name"]?.toString().trim() || "";
        const quantity = row["Quantity"]?.toString().trim() || "";

        const matchedProduct = products.find(
          (p) => p.name.toLowerCase() === productName.toLowerCase()
        );

        const item: BulkRestockItem = {
          id: `bulk-restock-${Date.now()}-${index}`,
          productName: matchedProduct ? matchedProduct.name : productName,
          quantity,
          matchedProductId: matchedProduct?._id,
          category: matchedProduct?.category,
          unit: matchedProduct?.unit,
          currentStock: matchedProduct?.quantity,
        };

        item.errors = validateItem(item);

        return item;
      });

      setItems(parsedItems);

      const matchedCount = parsedItems.filter((i) => i.matchedProductId).length;
      const unmatchedCount = parsedItems.length - matchedCount;

      if (unmatchedCount > 0) {
        toast.success(
          `${parsedItems.length} items loaded! ✅ ${matchedCount} matched, ⚠️ ${unmatchedCount} unmatched`,
          { duration: 5000 }
        );
      } else {
        toast.success(`${parsedItems.length} items loaded successfully! ✅ All matched!`);
      }
    } catch {
      toast.error("Failed to process file data");
    }
  };

  const validateItem = (item: BulkRestockItem): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!item.productName) {
      errors.productName = "Product name is required";
    } else if (!item.matchedProductId) {
      errors.productName = "Product not found in database";
    }

    const qty = Number(item.quantity);
    if (!item.quantity || isNaN(qty) || qty <= 0) {
      errors.quantity = "Must be > 0";
    }

    return errors;
  };

  const handleItemChange = (
    index: number,
    field: keyof BulkRestockItem,
    value: string
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "productName") {
        const matchedProduct = products.find(
          (p) => p.name.toLowerCase() === value.toLowerCase()
        );

        if (matchedProduct) {
          updated[index].productName = matchedProduct.name;
          updated[index].matchedProductId = matchedProduct._id;
          updated[index].category = matchedProduct.category;
          updated[index].unit = matchedProduct.unit;
          updated[index].currentStock = matchedProduct.quantity;
        } else {
          updated[index].matchedProductId = undefined;
          updated[index].category = undefined;
          updated[index].unit = undefined;
          updated[index].currentStock = undefined;
        }
      }

      updated[index].errors = validateItem(updated[index]);
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    const validItems = items.filter(
      (item) => !item.errors || Object.keys(item.errors).length === 0
    );

    if (validItems.length === 0) {
      toast.error("No valid items to save");
      return;
    }

    if (validItems.length < items.length) {
      toast.error(
        `${items.length - validItems.length} items have errors. Please fix them first.`
      );
      return;
    }

    setSaving(true);

    try {
      const updatePromises = validItems.map(async (item) => {
        const product = products.find((p) => p._id === item.matchedProductId);
        if (!product) return;

        const newQuantity = product.quantity + Number(item.quantity);

       const token = localStorage.getItem("token");
return fetch("/api/products", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    id: product._id,
    quantity: newQuantity,   // userId removed
  }),
});
      });

      await Promise.all(updatePromises);

      const restockHistoryPayload = {
        items: validItems.map((item) => ({
          productId: item.matchedProductId!,
          name: item.productName,
          category: item.category,
          unit: item.unit!,
          quantity: Number(item.quantity),
          note: localNote || "Restocking",
        })),
      };

    const token = localStorage.getItem("token");
const historyRes = await fetch("/api/restockHistory", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    items: restockHistoryPayload.items,  // userId removed from payload
  }),
});

      if (!historyRes.ok) {
        throw new Error("Failed to save restock history");
      }

      toast.success(
        `✅ ${validItems.length} products restocked successfully!`,
        { duration: 4000 }
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save restock");
    } finally {
      setSaving(false);
    }
  };

  const errorCount = items.filter(
    (item) => item.errors && Object.keys(item.errors).length > 0
  ).length;

  const matchedCount = items.filter((item) => item.matchedProductId).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              Bulk Restock Upload
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">
              Upload CSV or Excel file, review & edit, then save all
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 sm:py-5">
          {items.length === 0 ? (
            // Upload Section
            <div className="flex flex-col items-center justify-center py-6 sm:py-10">
              {/* Upload Area */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 sm:border-4 border-dashed border-green-500 rounded-xl sm:rounded-2xl p-6 sm:p-10 max-w-xl w-full text-center shadow-lg">
                <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 mx-auto mb-4" />
                <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                  Upload Your Restock File
                </h4>
                <p className="text-sm sm:text-base text-gray-700 mb-1 font-semibold">
                  Select a CSV or Excel file
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mb-6">
                  2 columns: <span className="font-bold text-green-700">Product Name</span> & <span className="font-bold text-green-700">Quantity</span>
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
                  className="px-6 sm:px-8 py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {uploading ? "⏳ Loading..." : "📁 Choose File"}
                </button>
                <p className="text-xs sm:text-sm text-gray-600 mt-4 font-semibold">
                  ✅ Supports: CSV, Excel (.xlsx, .xls)
                </p>
              </div>

              {/* Instructions */}
              <div className="mt-6 max-w-xl w-full bg-blue-50 border border-blue-300 rounded-lg p-4">
                <h5 className="font-bold text-blue-900 text-sm sm:text-base mb-2">📌 Quick Guide:</h5>
                <ul className="space-y-1.5 text-xs sm:text-sm text-blue-800">
                  <li>• Click format guide button on main page</li>
                  <li>• Download sample file from guide</li>
                  <li>• Fill product names and quantities</li>
                  <li>• Upload and review before saving</li>
                </ul>
              </div>
            </div>
          ) : (
            // Review Section
            <div className="space-y-4 sm:space-y-5">
              {/* Global Note Display */}
              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3 sm:p-4">
                <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-1.5">
                  📝 Restock Reason (Applied to All Items)
                </label>
                <input
                  type="text"
                  value={localNote}
                  onChange={(e) => setLocalNote(e.target.value)}
                  className="w-full bg-white border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 font-semibold focus:ring-2 focus:ring-blue-600 outline-none"
                  placeholder="e.g., Weekly Monday Restock"
                />
              </div>

              {/* Stats Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border-2 border-gray-300 rounded-lg px-4 py-3 shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <span className="text-lg font-bold text-green-700">
                        {matchedCount}
                      </span>
                      <p className="text-xs font-semibold text-gray-700">Matched</p>
                    </div>
                  </div>
                  {errorCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <span className="text-lg font-bold text-red-700">
                          {errorCount}
                        </span>
                        <p className="text-xs font-semibold text-gray-700">Errors</p>
                      </div>
                    </div>
                  )}
                  {items.length - matchedCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <span className="text-lg font-bold text-yellow-700">
                          {items.length - matchedCount}
                        </span>
                        <p className="text-xs font-semibold text-gray-700">Unmatched</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setItems([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-md transition-all"
                >
                  📤 Upload Different File
                </button>
              </div>

              {/* Items */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  📦 Products to Restock ({items.length} items)
                </h3>
                {items.map((item, index) => (
                  <BulkRestockRow
                    key={item.id}
                    item={item}
                    index={index}
                    onChange={handleItemChange}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-5 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm sm:text-base font-bold">
              {errorCount > 0 ? (
                <span className="text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  ❌ Fix {errorCount} item{errorCount > 1 ? "s" : ""} first
                </span>
              ) : (
                <span className="text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  ✅ Ready to save!
                </span>
              )}
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg border-2 border-gray-400 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-xs sm:text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving || errorCount > 0}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {saving ? "⏳ Saving..." : `💾 Save (${items.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}