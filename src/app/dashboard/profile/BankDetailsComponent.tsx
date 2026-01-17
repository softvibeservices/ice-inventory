// src/app/dashboard/profile/BankDetailsComponent.tsx

"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Building2, Edit3, Check } from "lucide-react";
import type { BankDetails } from "@/types/profile.types";

type Props = {
  sellerId: string | null;
};

export default function BankDetailsComponent({ sellerId }: Props) {
  const emptyBank: BankDetails = {
    bankName: "",
    ifscCode: "",
    branchName: "",
    bankingName: "",
    accountNumber: "",
  };

  const [bank, setBank] = useState<BankDetails>({ ...emptyBank });
  const [originalBank, setOriginalBank] = useState<BankDetails | null>(null);
  const [bankSaved, setBankSaved] = useState<boolean>(false);
  const [bankEditMode, setBankEditMode] = useState<boolean>(true);
  const [bankLoading, setBankLoading] = useState<boolean>(false);
  const [isBankDirty, setIsBankDirty] = useState<boolean>(false);

  // Helper: deep equality
  const isEqual = (a: any, b: any) => {
    try {
      return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
    } catch {
      return false;
    }
  };

  // Fetch bank details when sellerId is available
  useEffect(() => {
    if (!sellerId) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/bank-details?sellerId=${encodeURIComponent(sellerId)}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setBank(data);
          setOriginalBank(data);
          setBankSaved(true);
          setBankEditMode(false);
        } else {
          setBank({ ...emptyBank });
          setOriginalBank(null);
          setBankSaved(false);
          setBankEditMode(true);
        }
      } catch {
        // ignore
      }
    })();
  }, [sellerId]);

  // Detect changes between bank and originalBank
  useEffect(() => {
    setIsBankDirty(!isEqual(bank, originalBank ?? emptyBank));
  }, [bank, originalBank]);

  // Save bank details
  const saveBankDetails = async () => {
    if (!sellerId) {
      toast.error("Seller must be saved first");
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
        body: JSON.stringify({ sellerId, ...bank }),
      });

      const data = await res.json();
      setBankLoading(false);

      if (!res.ok) {
        toast.error(data.error || "Failed to save bank details ❌");
        return;
      }

      setBank(data);
      setOriginalBank(data);
      setBankSaved(true);
      setBankEditMode(false);
      setIsBankDirty(false);
      toast.success("Bank details saved ✅");
    } catch {
      setBankLoading(false);
      toast.error("Something went wrong while saving bank details ❌");
    }
  };

  // Cancel edits and revert to original saved bank details
  const cancelBankEdit = () => {
    if (originalBank) {
      setBank({ ...originalBank });
      setBankEditMode(false);
      setIsBankDirty(false);
    } else {
      setBank({ ...emptyBank });
      setBankEditMode(true);
      setIsBankDirty(true);
    }
  };

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
              <div className="font-medium text-gray-800">
                {bank.bankName || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">IFSC Code</div>
              <div className="font-medium text-gray-800">
                {bank.ifscCode || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Branch Name</div>
              <div className="font-medium text-gray-800">
                {bank.branchName || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Banking Name</div>
              <div className="font-medium text-gray-800">
                {bank.bankingName || "—"}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500">Account Number</div>
              <div className="font-medium text-gray-800">
                {bank.accountNumber || "—"}
              </div>
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
                onChange={(e) =>
                  setBank({ ...bank, bankName: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-gray-600">
              IFSC Code *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                placeholder="e.g., SBIN0001234"
                value={bank.ifscCode}
                onChange={(e) =>
                  setBank({ ...bank, ifscCode: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-gray-600">
              Branch Name *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                placeholder="e.g., Main Branch"
                value={bank.branchName}
                onChange={(e) =>
                  setBank({ ...bank, branchName: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-gray-600">
              Account Holder Name *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                placeholder="Name as per bank records"
                value={bank.bankingName}
                onChange={(e) =>
                  setBank({ ...bank, bankingName: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-gray-600 md:col-span-2">
              Account Number *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                placeholder="Enter account number"
                value={bank.accountNumber}
                onChange={(e) =>
                  setBank({ ...bank, accountNumber: e.target.value })
                }
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
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
            {bankEditMode && (
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