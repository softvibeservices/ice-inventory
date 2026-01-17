// src/app/dashboard/profile/BillingDetailsComponent.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { FileText, Edit3, Check } from "lucide-react";
import type { SellerDetails, UploadingState } from "@/types/profile.types";

type Props = {
  userId: string;
};

export default function BillingDetailsComponent({ userId }: Props) {
  const emptyBill: SellerDetails = {
    sellerName: "",
    gstNumber: "",
    fullAddress: "",
    logoUrl: "",
    qrCodeUrl: "",
    signatureUrl: "",
    slogan: "",
  };

  const [bill, setBill] = useState<SellerDetails>({ ...emptyBill });
  const [originalBill, setOriginalBill] = useState<SellerDetails | null>(null);
  const [uploading, setUploading] = useState<UploadingState>({
    logo: false,
    qr: false,
    sig: false,
  });
  const [editMode, setEditMode] = useState<boolean>(false);
  const [billSaved, setBillSaved] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [isBillDirty, setIsBillDirty] = useState<boolean>(false);

  // Helper: deep equality
  const isEqual = (a: any, b: any) => {
    try {
      return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
    } catch {
      return false;
    }
  };

  // Fetch seller/billing details on mount
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/seller-details?userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (data && !data.error && Object.keys(data).length > 0) {
          const mapped: SellerDetails = {
            sellerName: data.sellerName ?? "",
            gstNumber: data.gstNumber ?? "",
            fullAddress: data.fullAddress ?? "",
            logoUrl: data.logoUrl ?? "",
            logoPublicId: data.logoPublicId ?? data.logoPublicId,
            qrCodeUrl: data.qrCodeUrl ?? "",
            qrPublicId: data.qrPublicId ?? data.qrPublicId,
            signatureUrl: data.signatureUrl ?? "",
            signaturePublicId:
              data.signaturePublicId ?? data.signaturePublicId,
            slogan: data.slogan ?? "",
            _id: data._id ?? undefined,
            userId: data.userId ?? undefined,
          };
          setBill(mapped);
          setOriginalBill(mapped);
          setBillSaved(true);
          setEditMode(false);
          setIsBillDirty(false);
        } else {
          setBill({ ...emptyBill });
          setOriginalBill(null);
          setBillSaved(false);
          setEditMode(true);
          setIsBillDirty(false);
        }
      } catch {
        // ignore
      }
    })();
  }, [userId]);

  // Detect changes between bill and originalBill
  useEffect(() => {
    setIsBillDirty(!isEqual(bill, originalBill ?? emptyBill));
  }, [bill, originalBill]);

  // Client-side image validation helpers
  const readImageMeta = (
    file: File
  ): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(url);
      };
      img.onerror = reject;
      img.src = url;
    });

  const validateImage = async (file: File, kind: "logo" | "qr" | "sig") => {
    const sizeKB = Math.round(file.size / 1024);
    const { width, height } = await readImageMeta(file);
    if (kind === "logo") {
      if (sizeKB > 200) throw new Error("Logo must be ≤ 200 KB");
      if (width < 240 || height < 90) {
        toast.error(
          "Logo is smaller than recommended (300×120). It may appear blurry."
        );
      }
    }
    if (kind === "qr") {
      if (sizeKB > 250) throw new Error("QR must be ≤ 250 KB");
      if (width < 260 || height < 260)
        toast.error("QR is smaller than recommended (300×300).");
      if (Math.abs(width - height) > 5) {
        throw new Error("QR should be square (e.g., 300×300)");
      }
    }
    if (kind === "sig") {
      if (sizeKB > 200) throw new Error("Signature must be ≤ 200 KB");
      if (width < 240 || height < 90)
        toast.error("Signature is smaller than recommended (300×120).");
    }
    return { width, height, sizeKB };
  };

  const pickLabel = useMemo(
    () => ({
      logo: "Logo (optional)",
      qr: "QR Code (required)",
      sig: "Supplier Signature (required)",
    }),
    []
  );

  // Upload to Cloudinary via API route
  const uploadToCloudinary = async (file: File, tag: "logo" | "qr" | "sig") => {
    try {
      setUploading((u) => ({ ...u, [tag]: true }));
      await validateImage(file, tag);
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "icecream-inventory/billing-assets");
      form.append("tag", tag);
      const res = await fetch("/api/uploads/image", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      if (tag === "logo") {
        setBill((b) => ({
          ...b,
          logoUrl: data.secure_url,
          logoPublicId: data.public_id,
        }));
      } else if (tag === "qr") {
        setBill((b) => ({
          ...b,
          qrCodeUrl: data.secure_url,
          qrPublicId: data.public_id,
        }));
      } else {
        setBill((b) => ({
          ...b,
          signatureUrl: data.secure_url,
          signaturePublicId: data.public_id,
        }));
      }
      toast.success(`${pickLabel[tag]} uploaded ✅`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed ❌");
    } finally {
      setUploading((u) => ({ ...u, [tag]: false }));
    }
  };

  // Save bill details to server (create or update)
  const saveBillDetails = async () => {
    if (!userId) {
      toast.error("User not found");
      return;
    }
    if (
      !bill.sellerName ||
      !bill.gstNumber ||
      !bill.fullAddress ||
      !bill.qrCodeUrl ||
      !bill.signatureUrl ||
      !bill.slogan
    ) {
      toast.error(
        "Please fill all required bill fields (QR & Signature are mandatory) ❗"
      );
      return;
    }
    setSaveLoading(true);
    try {
      const res = await fetch("/api/seller-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...bill }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveLoading(false);
        toast.error(data?.error || "Failed to save bill details ❌");
        return;
      }
      const normalized: SellerDetails = {
        sellerName: data.sellerName ?? bill.sellerName,
        gstNumber: data.gstNumber ?? bill.gstNumber,
        fullAddress: data.fullAddress ?? bill.fullAddress,
        logoUrl: data.logoUrl ?? bill.logoUrl,
        logoPublicId: data.logoPublicId ?? bill.logoPublicId,
        qrCodeUrl: data.qrCodeUrl ?? bill.qrCodeUrl,
        qrPublicId: data.qrPublicId ?? bill.qrPublicId,
        signatureUrl: data.signatureUrl ?? bill.signatureUrl,
        signaturePublicId: data.signaturePublicId ?? bill.signaturePublicId,
        slogan: data.slogan ?? bill.slogan,
        _id: data._id ?? data._id,
        userId: data.userId ?? userId,
      };
      setBill(normalized);
      setOriginalBill(normalized);
      setBillSaved(true);
      setEditMode(false);
      setIsBillDirty(false);
      setSaveLoading(false);
      toast.success("Bill details saved ✅");
    } catch (err) {
      setSaveLoading(false);
      toast.error("Something went wrong while saving bill details ❌");
    }
  };

  // Cancel edits and revert to original saved bill
  const cancelBillEdit = () => {
    if (originalBill) {
      setBill({ ...originalBill });
      setEditMode(false);
      setIsBillDirty(false);
    } else {
      setBill({ ...emptyBill });
      setEditMode(true);
      setIsBillDirty(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-gray-800">
          <FileText className="w-5 h-5" /> 
          <span className="leading-tight">Bill Details <span className="hidden sm:inline">(for Invoice Generation)</span></span>
        </h2>
        {billSaved && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="text-gray-700 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50 transition-colors w-full sm:w-auto"
          >
            <Edit3 size={16} /> Edit
          </button>
        )}
      </div>

      {/* View Mode - Saved Details */}
      {!editMode && billSaved ? (
        <div className="border rounded-lg p-4 sm:p-5 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Seller</div>
              <div className="font-medium text-gray-800 break-words">
                {bill.sellerName || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">GST Number</div>
              <div className="font-medium text-gray-800 break-all">
                {bill.gstNumber || "—"}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Full Address</div>
              <div className="text-sm text-gray-800 break-words">
                {bill.fullAddress || "—"}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Slogan</div>
              <div className="text-sm text-gray-800 break-words">
                {bill.slogan || "—"}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-2">Assets</div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {bill.logoUrl ? (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-gray-500">Logo</div>
                    <img
                      src={bill.logoUrl}
                      alt="Logo"
                      className="h-12 max-w-[120px] object-contain rounded border bg-white p-1"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-gray-500">Logo</div>
                    <div className="h-12 w-28 bg-white border flex items-center justify-center text-xs text-gray-400 rounded">
                      No Logo
                    </div>
                  </div>
                )}
                {bill.qrCodeUrl ? (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-gray-500">QR Code</div>
                    <img
                      src={bill.qrCodeUrl}
                      alt="QR"
                      className="h-16 w-16 object-contain rounded border bg-white p-1"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-gray-500">QR Code</div>
                    <div className="h-16 w-16 bg-white border flex items-center justify-center text-xs text-gray-400 rounded">
                      No QR
                    </div>
                  </div>
                )}
                {bill.signatureUrl ? (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-gray-500">Signature</div>
                    <img
                      src={bill.signatureUrl}
                      alt="Signature"
                      className="h-12 max-w-[160px] object-contain rounded border bg-white p-1"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-gray-500">Signature</div>
                    <div className="h-12 w-36 bg-white border flex items-center justify-center text-xs text-gray-400 rounded">
                      No Signature
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t flex items-center gap-3">
            <div className="inline-flex items-center gap-2 text-green-600">
              <Check size={16} /> 
              <span className="text-sm font-medium">Saved</span>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode - Form */
        <div className="border rounded-lg p-4 sm:p-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seller Name */}
            <label className="text-sm text-gray-600">
              Name of the Seller *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                value={bill.sellerName || ""}
                onChange={(e) =>
                  setBill((b) => ({
                    ...b,
                    sellerName: e.target.value,
                  }))
                }
                placeholder="Seller / Supplier Name"
              />
            </label>

            {/* GST Number */}
            <label className="text-sm text-gray-600">
              GST Number *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                value={bill.gstNumber || ""}
                onChange={(e) =>
                  setBill((b) => ({
                    ...b,
                    gstNumber: e.target.value,
                  }))
                }
                placeholder="e.g., 24ABCDE1234F1Z5"
              />
            </label>

            {/* Full Address */}
            <label className="text-sm text-gray-600 md:col-span-2">
              Full Address of the Supplier *
              <textarea
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                value={bill.fullAddress || ""}
                onChange={(e) =>
                  setBill((b) => ({
                    ...b,
                    fullAddress: e.target.value,
                  }))
                }
                placeholder="Street, Area, City, State, Pincode"
                rows={3}
              />
            </label>

            {/* Logo Upload */}
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="text-sm text-gray-600">
                  Logo (optional)
                  <span className="block text-xs text-gray-500 mt-0.5">
                    ~300×120 px, ≤ 200 KB
                  </span>
                </div>
                {bill.logoUrl ? (
                  <a
                    href={bill.logoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 text-xs underline hover:text-blue-700"
                  >
                    Preview →
                  </a>
                ) : null}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  uploadToCloudinary(file, "logo");
                }}
                className="w-full border rounded-lg p-2 sm:p-2.5 bg-white text-gray-700 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
                disabled={uploading.logo}
              />
              {uploading.logo && (
                <p className="text-xs text-purple-600 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
                  Uploading logo...
                </p>
              )}
            </div>

            {/* QR Code Upload */}
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="text-sm text-gray-600">
                  QR Code (required) *
                  <span className="block text-xs text-gray-500 mt-0.5">
                    300×300 px, ≤ 250 KB
                  </span>
                </div>
                {bill.qrCodeUrl ? (
                  <a
                    href={bill.qrCodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 text-xs underline hover:text-blue-700"
                  >
                    Preview →
                  </a>
                ) : null}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  uploadToCloudinary(file, "qr");
                }}
                className="w-full border rounded-lg p-2 sm:p-2.5 bg-white text-gray-700 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
                disabled={uploading.qr}
              />
              {uploading.qr && (
                <p className="text-xs text-purple-600 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
                  Uploading QR code...
                </p>
              )}
            </div>

            {/* Signature Upload */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="text-sm text-gray-600">
                  Signature of the Supplier (required) *
                  <span className="block text-xs text-gray-500 mt-0.5">
                    ~300×120 px, ≤ 200 KB
                  </span>
                </div>
                {bill.signatureUrl ? (
                  <a
                    href={bill.signatureUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 text-xs underline hover:text-blue-700"
                  >
                    Preview →
                  </a>
                ) : null}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  uploadToCloudinary(file, "sig");
                }}
                className="w-full border rounded-lg p-2 sm:p-2.5 bg-white text-gray-700 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
                disabled={uploading.sig}
              />
              {uploading.sig && (
                <p className="text-xs text-purple-600 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
                  Uploading signature...
                </p>
              )}
            </div>

            {/* Slogan */}
            <label className="text-sm text-gray-600 md:col-span-2">
              Slogan (appears in bill footer) *
              <input
                className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                value={bill.slogan || ""}
                onChange={(e) =>
                  setBill((b) => ({
                    ...b,
                    slogan: e.target.value,
                  }))
                }
                placeholder="Thank you for choosing <Your Shop Name>!"
              />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 pt-4 border-t flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={saveBillDetails}
              disabled={saveLoading || !isBillDirty}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-colors w-full sm:w-auto ${
                saveLoading
                  ? "bg-purple-400 cursor-wait"
                  : isBillDirty
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {saveLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : billSaved ? (
                "Update Bill Details"
              ) : (
                "Save Bill Details"
              )}
            </button>
            {editMode && (
              <button
                onClick={cancelBillEdit}
                className="text-gray-700 px-5 py-2.5 rounded-lg border hover:bg-gray-50 transition-colors font-medium w-full sm:w-auto"
              >
                Cancel
              </button>
            )}
            <div className="text-xs text-gray-500 sm:ml-auto text-center sm:text-left">
              {billSaved
                ? "Saved to database. Click Edit to modify."
                : "Fill required fields and save to store billing info."}
            </div>
          </div>
        </div>
      )}
    </div>
  );

}