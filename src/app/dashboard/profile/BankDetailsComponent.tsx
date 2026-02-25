// ice-inventory\src\app\dashboard\profile\BankDetailsComponent.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Building2, Edit3, Check, AlertCircle } from "lucide-react";
import type { BankDetails } from "@/types/profile.types";

// ✅ FIX: Defined OUTSIDE component so it's a stable reference.
// If it were inside, every render creates a new object, breaking the dirty-check useEffect.
const emptyBank: BankDetails = {
  bankName: "",
  ifscCode: "",
  branchName: "",
  bankingName: "",
  accountNumber: "",
};

type Props = {
  sellerId: string; // non-null guaranteed by parent
};

export default function BankDetailsComponent({ sellerId }: Props) {
  const [bank, setBank] = useState<BankDetails>({ ...emptyBank });
  const [originalBank, setOriginalBank] = useState<BankDetails | null>(null);
  const [bankSaved, setBankSaved] = useState<boolean>(false);
  const [bankEditMode, setBankEditMode] = useState<boolean>(true);
  const [bankLoading, setBankLoading] = useState<boolean>(false);
  const [fetchLoading, setFetchLoading] = useState<boolean>(true);
  const [isBankDirty, setIsBankDirty] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isEqual = (a: any, b: any) => {
    try {
      return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
    } catch {
      return false;
    }
  };

  const fetchBankDetails = useCallback(async () => {
    if (!sellerId) return;

    if (!/^[a-f\d]{24}$/i.test(sellerId)) {
      console.error("BankDetailsComponent received invalid sellerId:", sellerId);
      setFetchError("Invalid seller ID. Please contact support.");
      setFetchLoading(false);
      return;
    }

    setFetchLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(
        `/api/bank-details?sellerId=${encodeURIComponent(sellerId)}`
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data && Object.keys(data).length > 0 && data.bankName) {
        const normalized: BankDetails = {
          _id: data._id ? String(data._id) : undefined,
          sellerId: data.sellerId ? String(data.sellerId) : undefined,
          bankName: data.bankName ?? "",
          ifscCode: data.ifscCode ?? "",
          branchName: data.branchName ?? "",
          bankingName: data.bankingName ?? "",
          accountNumber: data.accountNumber ?? "",
        };
        setBank(normalized);
        setOriginalBank(normalized);
        setBankSaved(true);
        setBankEditMode(false);
      } else {
        setBank({ ...emptyBank });
        setOriginalBank(null);
        setBankSaved(false);
        setBankEditMode(true);
      }
    } catch (err: any) {
      console.error("Failed to fetch bank details:", err);
      setFetchError(err.message || "Failed to load bank details");
    } finally {
      setFetchLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchBankDetails();
  }, [fetchBankDetails]);

  // ✅ FIX: Compare only data fields, not metadata (_id, sellerId)
  useEffect(() => {
    const baseline = originalBank ?? emptyBank;
    const bankData = {
      bankName: bank.bankName,
      ifscCode: bank.ifscCode,
      branchName: bank.branchName,
      bankingName: bank.bankingName,
      accountNumber: bank.accountNumber,
    };
    const baselineData = {
      bankName: baseline.bankName,
      ifscCode: baseline.ifscCode,
      branchName: baseline.branchName,
      bankingName: baseline.bankingName,
      accountNumber: baseline.accountNumber,
    };
    setIsBankDirty(!isEqual(bankData, baselineData));
  }, [bank, originalBank]);

  const saveBankDetails = async () => {
    if (!sellerId) {
      toast.error("Seller must be saved first");
      return;
    }

    if (!/^[a-f\d]{24}$/i.test(sellerId)) {
      toast.error("Invalid seller ID. Please refresh and try again.");
      return;
    }

    if (
      !bank.bankName ||
      !bank.ifscCode ||
      !bank.branchName ||
      !bank.bankingName ||
      !bank.accountNumber
    ) {
      toast.error("Please fill all bank details fields ❗");
      return;
    }

    setBankLoading(true);
    try {
      const res = await fetch("/api/bank-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId,
          bankName: bank.bankName,
          ifscCode: bank.ifscCode,
          branchName: bank.branchName,
          bankingName: bank.bankingName,
          accountNumber: bank.accountNumber,
        }),
      });

      const data = await res.json();
      setBankLoading(false);

      if (!res.ok) {
        toast.error(data.error || "Failed to save bank details ❌");
        return;
      }

      const normalized: BankDetails = {
        _id: data._id ? String(data._id) : undefined,
        sellerId: data.sellerId ? String(data.sellerId) : undefined,
        bankName: data.bankName ?? "",
        ifscCode: data.ifscCode ?? "",
        branchName: data.branchName ?? "",
        bankingName: data.bankingName ?? "",
        accountNumber: data.accountNumber ?? "",
      };

      setBank(normalized);
      setOriginalBank(normalized);
      setBankSaved(true);
      setBankEditMode(false);
      setIsBankDirty(false);
      toast.success("Bank details saved ✅");
    } catch (err: any) {
      setBankLoading(false);
      toast.error("Something went wrong while saving bank details ❌");
      console.error("Save bank details error:", err);
    }
  };

  const cancelBankEdit = () => {
    if (originalBank) {
      setBank({ ...originalBank });
      setBankEditMode(false);
      setIsBankDirty(false);
    } else {
      setBank({ ...emptyBank });
      setBankEditMode(true);
      setIsBankDirty(false);
    }
  };

  // Loading state
  if (fetchLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
          <Building2 className="w-5 h-5" /> Bank Details
        </h2>
        <div className="flex items-center justify-center py-10 text-gray-400">
          <p className="text-sm">Loading bank details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
          <Building2 className="w-5 h-5" /> Bank Details
        </h2>
        <div className="flex items-center gap-3 p-4 border border-red-200 rounded-lg bg-red-50 text-red-700">
          <AlertCircle size={18} />
          <div>
            <p className="text-sm font-medium">Failed to load bank details</p>
            <p className="text-xs mt-1">{fetchError}</p>
          </div>
          <button
            onClick={fetchBankDetails}
            className="ml-auto text-xs text-red-600 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
          <Building2 className="w-5 h-5" /> Bank Details
        </h2>
        {bankSaved && !bankEditMode && (
          <button
            onClick={() => setBankEditMode(true)}
            className="text-gray-700 inline-flex items-center gap-2 px-3 py-1 rounded text-sm border hover:bg-gray-50"
          >
            <Edit3 size={16} /> Edit
          </button>
        )}
      </div>

      {!bankEditMode && bankSaved ? (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Bank Name</div>
              <div className="font-medium text-gray-800">{bank.bankName || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">IFSC Code</div>
              <div className="font-medium text-gray-800">{bank.ifscCode || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Branch Name</div>
              <div className="font-medium text-gray-800">{bank.branchName || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Banking Name</div>
              <div className="font-medium text-gray-800">{bank.bankingName || "—"}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500">Account Number</div>
              <div className="font-medium text-gray-800">{bank.accountNumber || "—"}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="inline-flex items-center gap-2 text-green-600">
              <Check size={16} /> <span className="text-sm">Saved</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-600">
              Bank Name *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                placeholder="e.g., State Bank of India"
                value={bank.bankName}
                onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
              />
            </label>
            <label className="text-sm text-gray-600">
              IFSC Code *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                placeholder="e.g., SBIN0001234"
                value={bank.ifscCode}
                onChange={(e) => setBank({ ...bank, ifscCode: e.target.value })}
              />
            </label>
            <label className="text-sm text-gray-600">
              Branch Name *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                placeholder="e.g., Main Branch"
                value={bank.branchName}
                onChange={(e) => setBank({ ...bank, branchName: e.target.value })}
              />
            </label>
            <label className="text-sm text-gray-600">
              Account Holder Name *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                placeholder="Name as per bank records"
                value={bank.bankingName}
                onChange={(e) => setBank({ ...bank, bankingName: e.target.value })}
              />
            </label>
            <label className="text-sm text-gray-600 md:col-span-2">
              Account Number *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                placeholder="Enter account number"
                value={bank.accountNumber}
                onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={saveBankDetails}
              disabled={bankLoading || !isBankDirty}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded text-white ${
                bankLoading
                  ? "bg-indigo-400"
                  : isBankDirty
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {bankLoading
                ? "Saving..."
                : bankSaved
                ? "Update Bank Details"
                : "Save Bank Details"}
            </button>
            {bankEditMode && bankSaved && (
              <button
                onClick={cancelBankEdit}
                className="text-gray-700 px-3 py-2 rounded border hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <div className="text-xs text-gray-500">
              {bankSaved
                ? "Saved to database. Click Edit to modify."
                : "Fill all required fields and save to store bank details."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}