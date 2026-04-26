// src/app/dashboard/customers/BulkCustomerUploadModal.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, AlertCircle, CheckCircle, FileSpreadsheet } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import BulkCustomerRow, { BulkCustomer } from "./BulkCustomerRow";

interface BulkCustomerUploadModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkCustomerUploadModal({
  userId,
  onClose,
  onSuccess,
}: BulkCustomerUploadModalProps) {
  const [customers, setCustomers] = useState<BulkCustomer[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing customers for duplicate detection
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        setLoadingExisting(true);
        const token = localStorage.getItem("token");
        const res = await fetch("/api/customers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setExistingCustomers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch existing customers:", error);
      } finally {
        setLoadingExisting(false);
      }
    };

    if (userId) {
      fetchExisting();
    }
  }, [userId]);

  // Duplicate check: name + shopName + area (case-insensitive)
  const isDuplicateCustomer = (name: string, shopName: string, area: string): boolean => {
    const n = name.trim().toLowerCase();
    const s = shopName.trim().toLowerCase();
    const a = area.trim().toLowerCase();

    return existingCustomers.some(
      (ex) =>
        ex.name.trim().toLowerCase() === n &&
        ex.shopName.trim().toLowerCase() === s &&
        ex.area.trim().toLowerCase() === a
    );
  };

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
      const parsed = data.map((row: any, index: number) => {
        const name = row["Customer Name"]?.toString().trim() || "";
        const contact1 = row["Contact 1"]?.toString().trim() || "";
        const contact2 = row["Contact 2"]?.toString().trim() || "";
        const contact3 = row["Contact 3"]?.toString().trim() || "";
        const shopName = row["Shop Name"]?.toString().trim() || "";
        const shopAddress = row["Shop Address"]?.toString().trim() || "";
        const area = row["Area"]?.toString().trim() || "";
        const remarks = row["Remarks"]?.toString().trim() || "";
        const credit = row["Opening Credit"]?.toString().trim() || "0";
        const debit = row["Opening Debit"]?.toString().trim() || "0";

        const customer: BulkCustomer = {
          id: `bulk-${Date.now()}-${index}`,
          name,
          contact1,
          contact2,
          contact3,
          shopName,
          shopAddress,
          area,
          remarks,
          credit,
          debit,
        };

        customer.isDuplicate = isDuplicateCustomer(name, shopName, area);
        customer.errors = validateCustomer(customer);

        return customer;
      });

      setCustomers(parsed);

      const duplicateCount = parsed.filter((c) => c.isDuplicate).length;
      if (duplicateCount > 0) {
        toast.error(
          `⚠️ ${duplicateCount} duplicate customer(s) found! Please review and remove them.`,
          { duration: 5000 }
        );
      } else {
        toast.success(`${parsed.length} customers loaded successfully! ✅`);
      }
    } catch (error) {
      console.error("Data processing error:", error);
      toast.error("Failed to process file data");
    }
  };

  const validateCustomer = (customer: BulkCustomer): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!customer.name.trim()) {
      errors.name = "Required";
    }

    if (!customer.contact1.trim()) {
      errors.contact1 = "Required";
    } else if (!/^\d{6,15}$/.test(customer.contact1.replace(/\s+/g, ""))) {
      errors.contact1 = "Must be 6–15 digits";
    }

    if (!customer.shopName.trim()) {
      errors.shopName = "Required";
    }

    if (!customer.shopAddress.trim()) {
      errors.shopAddress = "Required";
    }

    if (!customer.area.trim()) {
      errors.area = "Required";
    }

    return errors;
  };

  const handleCustomerChange = (
    index: number,
    field: keyof BulkCustomer,
    value: string
  ) => {
    setCustomers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Re-check duplicates when relevant fields change
      if (field === "name" || field === "shopName" || field === "area") {
        updated[index].isDuplicate = isDuplicateCustomer(
          field === "name" ? value : updated[index].name,
          field === "shopName" ? value : updated[index].shopName,
          field === "area" ? value : updated[index].area
        );
      }

      updated[index].errors = validateCustomer(updated[index]);
      return updated;
    });
  };

  const handleRemoveCustomer = (index: number) => {
    setCustomers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    // Block if duplicates exist
    const duplicates = customers.filter((c) => c.isDuplicate);
    if (duplicates.length > 0) {
      toast.error(
        `Cannot save: ${duplicates.length} duplicate customer(s) found. Please remove them first.`,
        { duration: 5000 }
      );
      return;
    }

    // Block if any errors
    const withErrors = customers.filter(
      (c) => c.errors && Object.keys(c.errors).length > 0
    );
    if (withErrors.length > 0) {
      toast.error(
        `${withErrors.length} customer(s) have errors. Please fix them first.`
      );
      return;
    }

    if (customers.length === 0) {
      toast.error("No customers to save");
      return;
    }

    setSaving(true);

    try {
      const payload = customers.map((c) => {
        const contacts = [c.contact1, c.contact2, c.contact3].filter(Boolean);
        return {
          name: c.name,
          contacts,
          shopName: c.shopName,
          shopAddress: c.shopAddress,
          area: c.area,
          remarks: c.remarks || "",
          credit: Number(c.credit) || 0,
          debit: Number(c.debit) || 0,
        };
      });

      const token = localStorage.getItem("token");
      const res = await fetch("/api/customers/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ customers: payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save customers");
      }

      toast.success(`✅ ${customers.length} customers saved successfully!`, {
        duration: 4000,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Bulk save error:", error);
      toast.error(error.message || "Failed to save customers");
    } finally {
      setSaving(false);
    }
  };

  const errorCount = customers.filter(
    (c) => c.errors && Object.keys(c.errors).length > 0
  ).length;

  const duplicateCount = customers.filter((c) => c.isDuplicate).length;

  if (loadingExisting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading customer data...</p>
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
              Bulk Upload Customers
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Upload CSV or Excel file, review &amp; edit, then save all
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
          {customers.length === 0 ? (
            // Upload Section
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-400 rounded-2xl p-12 max-w-lg w-full text-center">
                <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">Upload Your File</h4>
                <p className="text-base text-gray-700 mb-6">
                  Select a CSV or Excel file containing your customers
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
                <p className="text-sm text-gray-500 mt-4">Supports: CSV, XLSX, XLS</p>
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
                      {customers.length - errorCount - duplicateCount} Valid
                    </span>
                  </div>
                  {duplicateCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                      <span className="text-base font-bold text-orange-700">
                        {duplicateCount} Duplicate{duplicateCount > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  {errorCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                      <span className="text-base font-bold text-red-700">
                        {errorCount} Error{errorCount > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCustomers([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-base text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  Upload Different File
                </button>
              </div>

              {/* Customer Cards */}
              <div className="space-y-4">
                {customers.map((customer, index) => (
                  <BulkCustomerRow
                    key={customer.id}
                    customer={customer}
                    index={index}
                    onChange={handleCustomerChange}
                    onRemove={handleRemoveCustomer}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {customers.length > 0 && (
          <div className="flex items-center justify-between px-6 py-5 border-t border-gray-200 bg-gray-50">
            <div className="text-base font-medium">
              {duplicateCount > 0 ? (
                <span className="text-orange-700">
                  ⚠️ Remove {duplicateCount} duplicate customer{duplicateCount > 1 ? "s" : ""} before saving
                </span>
              ) : errorCount > 0 ? (
                <span className="text-red-700">
                  ❌ Fix {errorCount} customer{errorCount > 1 ? "s" : ""} before saving
                </span>
              ) : (
                <span className="text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  All customers are valid
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
                disabled={saving || errorCount > 0 || duplicateCount > 0}
                className="px-8 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {saving
                  ? "Saving..."
                  : `Save All (${customers.length - duplicateCount - errorCount})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}