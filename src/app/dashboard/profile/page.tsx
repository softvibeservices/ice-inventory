"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import { User, Lock, LogOut, FileText, Edit3, Check } from "lucide-react";

type ActiveTab = "basic" | "password" | "billing" | "bank" | "logout";

type SellerDetails = {
  _id?: string;
  userId?: string;
  sellerName?: string;
  gstNumber?: string;
  fullAddress?: string;
  logoUrl?: string;
  logoPublicId?: string;
  qrCodeUrl?: string;
  qrPublicId?: string;
  signatureUrl?: string;
  signaturePublicId?: string;
  slogan?: string;
};

type BankDetails = {
  _id?: string;
  sellerId?: string;
  bankName: string;
  ifscCode: string;
  branchName: string;
  bankingName: string;
  accountNumber: string;
};

export default function ProfilePage() {
  const router = useRouter();
  // user/profile
  const [user, setUser] = useState<any>(null);
  const [originalUser, setOriginalUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("basic");
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "" });

  // billing / seller details
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
  const [uploading, setUploading] = useState({ logo: false, qr: false, sig: false });
  const [editMode, setEditMode] = useState<boolean>(false);
  const [billSaved, setBillSaved] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [isBillDirty, setIsBillDirty] = useState<boolean>(false);

  // bank details
  const emptyBank: BankDetails = {
    bankName: "",
    ifscCode: "",
    branchName: "",
    bankingName: "",
    accountNumber: "",
  };
  const [bank, setBank] = useState<BankDetails>({ ...emptyBank });
  const [originalBank, setOriginalBank] = useState<BankDetails | null>(null);
  const [bankSaved, setBankSaved] = useState(false);
  const [bankEditMode, setBankEditMode] = useState(true);
  const [bankLoading, setBankLoading] = useState(false);
  const [isBankDirty, setIsBankDirty] = useState(false);

  // ===== helper: deep equality (simple) =====
  const isEqual = (a: any, b: any) => {
    try {
      return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
    } catch {
      return false;
    }
  };

  // ===== Fetch logged user profile =====
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?._id) {
          fetch(`/api/profile?userId=${encodeURIComponent(parsed._id)}`)
            .then((res) => res.json())
            .then((data) => {
              if (data?.error) {
                toast.error(data.error);
              } else {
                setUser(data);
                setOriginalUser(data);
              }
            })
            .catch(() => toast.error("Failed to load profile ❌"));
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  // ===== Fetch seller/billing details (last saved) =====
  useEffect(() => {
    if (!user?._id) return;
    (async () => {
      try {
        const res = await fetch(`/api/seller-details?userId=${encodeURIComponent(user._id)}`);
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (data && !data.error && Object.keys(data).length > 0) {
          setBill({
            sellerName: data.sellerName ?? "",
            gstNumber: data.gstNumber ?? "",
            fullAddress: data.fullAddress ?? "",
            logoUrl: data.logoUrl ?? "",
            logoPublicId: data.logoPublicId ?? data.logoPublicId,
            qrCodeUrl: data.qrCodeUrl ?? "",
            qrPublicId: data.qrPublicId ?? data.qrPublicId,
            signatureUrl: data.signatureUrl ?? "",
            signaturePublicId: data.signaturePublicId ?? data.signaturePublicId,
            slogan: data.slogan ?? "",
            _id: data._id ?? undefined,
            userId: data.userId ?? undefined,
          });
          setOriginalBill({
            sellerName: data.sellerName ?? "",
            gstNumber: data.gstNumber ?? "",
            fullAddress: data.fullAddress ?? "",
            logoUrl: data.logoUrl ?? "",
            logoPublicId: data.logoPublicId ?? data.logoPublicId,
            qrCodeUrl: data.qrCodeUrl ?? "",
            qrPublicId: data.qrPublicId ?? data.qrPublicId,
            signatureUrl: data.signatureUrl ?? "",
            signaturePublicId: data.signaturePublicId ?? data.signaturePublicId,
            slogan: data.slogan ?? "",
            _id: data._id ?? undefined,
            userId: data.userId ?? undefined,
          });
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
  }, [user?._id]);

  // ===== Fetch bank details =====
  useEffect(() => {
    if (!bill?._id) return;
    (async () => {
      const res = await fetch(`/api/bank-details?sellerId=${bill._id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        setBank(data);
        setOriginalBank(data);
        setBankSaved(true);
        setBankEditMode(false);
      } else {
        setBank({ ...emptyBank });
        setBankSaved(false);
        setBankEditMode(true);
      }
    })();
  }, [bill?._id]);

  // ===== detect changes between bill and originalBill =====
  useEffect(() => {
    setIsBillDirty(!isEqual(bill, originalBill ?? emptyBill));
  }, [bill, originalBill]);

  // ===== detect changes between bank and originalBank =====
  useEffect(() => {
    setIsBankDirty(!isEqual(bank, originalBank ?? emptyBank));
  }, [bank, originalBank]);

  // ===== Basic profile change detection =====
  const isChanged =
    user &&
    originalUser &&
    (user.name !== originalUser.name ||
      user.email !== originalUser.email ||
      user.contact !== originalUser.contact ||
      user.shopName !== originalUser.shopName ||
      user.shopAddress !== originalUser.shopAddress);

  // ===== Update basic profile =====
  const updateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          name: user.name,
          email: user.email,
          contact: user.contact,
          shopName: user.shopName,
          shopAddress: user.shopAddress,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setUser(data);
        setOriginalUser(data);
        toast.success("Profile updated successfully ✅");
      } else {
        toast.error(data.error || "Update failed ❌");
      }
    } catch {
      setLoading(false);
      toast.error("Something went wrong ❌");
    }
  };

  // ===== Change password =====
  const changePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      toast.error("Please fill both fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, ...passwordForm }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        toast.success("Password changed successfully 🔑");
        setPasswordForm({ oldPassword: "", newPassword: "" });
      } else {
        toast.error(data.error || "Failed to change password ❌");
      }
    } catch {
      setLoading(false);
      toast.error("Something went wrong ❌");
    }
  };

  // ===== Logout =====
  const logout = () => {
    localStorage.removeItem("user");
    toast.success("Logged out 👋");
    router.push("/login");
  };

  // ===== Client-side image validation helpers =====
  const readImageMeta = (file: File): Promise<{ width: number; height: number }> =>
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
        toast.error("Logo is smaller than recommended (300×120). It may appear blurry.");
      }
    }
    if (kind === "qr") {
      if (sizeKB > 250) throw new Error("QR must be ≤ 250 KB");
      if (width < 260 || height < 260) toast.error("QR is smaller than recommended (300×300).");
      if (Math.abs(width - height) > 5) {
        throw new Error("QR should be square (e.g., 300×300)");
      }
    }
    if (kind === "sig") {
      if (sizeKB > 200) throw new Error("Signature must be ≤ 200 KB");
      if (width < 240 || height < 90) toast.error("Signature is smaller than recommended (300×120).");
    }
    return { width, height, sizeKB };
  };

  const pickLabel = useMemo(
    () => ({ logo: "Logo (optional)", qr: "QR Code (required)", sig: "Supplier Signature (required)" }),
    []
  );

  // ===== Upload to Cloudinary via API route =====
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
        setBill((b) => ({ ...b, logoUrl: data.secure_url, logoPublicId: data.public_id }));
      } else if (tag === "qr") {
        setBill((b) => ({ ...b, qrCodeUrl: data.secure_url, qrPublicId: data.public_id }));
      } else {
        setBill((b) => ({ ...b, signatureUrl: data.secure_url, signaturePublicId: data.public_id }));
      }
      toast.success(`${pickLabel[tag]} uploaded ✅`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed ❌");
    } finally {
      setUploading((u) => ({ ...u, [tag]: false }));
    }
  };

  // ===== Save bill details to server (create or update) =====
  const saveBillDetails = async () => {
    if (!user?._id) {
      toast.error("User not found");
      return;
    }
    if (!bill.sellerName || !bill.gstNumber || !bill.fullAddress || !bill.qrCodeUrl || !bill.signatureUrl || !bill.slogan) {
      toast.error("Please fill all required bill fields (QR & Signature are mandatory) ❗");
      return;
    }
    setSaveLoading(true);
    try {
      const res = await fetch("/api/seller-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, ...bill }),
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
        userId: data.userId ?? user._id,
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

  // ===== Cancel edits and revert to original saved bill =====
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

  // ===== Save bank details =====
  const saveBankDetails = async () => {
    if (!bill?._id) {
      toast.error("Seller must be saved first");
      return;
    }
    setBankLoading(true);
    try {
      const res = await fetch("/api/bank-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId: bill._id, ...bank }),
      });
      const data = await res.json();
      setBankLoading(false);
      if (!res.ok) return toast.error(data.error || "Failed to save");
      setBank(data);
      setOriginalBank(data);
      setBankSaved(true);
      setBankEditMode(false);
      toast.success("Bank details saved ✅");
    } catch {
      setBankLoading(false);
      toast.error("Something went wrong ❌");
    }
  };

  // ===== UI =====
  if (!user) return <p className="p-6 text-gray-700">Loading...</p>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <DashboardNavbar />
      <main className="flex-grow container mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 bg-white rounded-xl shadow-md p-4 space-y-2">
          <button
            onClick={() => setActiveTab("basic")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium ${
              activeTab === "basic" ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <User size={18} /> Basic Information
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium ${
              activeTab === "billing" ? "bg-purple-600 text-white" : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <FileText size={18} /> Bill Details
          </button>
          <button
            onClick={() => setActiveTab("bank")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium ${
              activeTab === "bank" ? "bg-indigo-600 text-white" : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            🏦 Bank Details
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium ${
              activeTab === "password" ? "bg-green-600 text-white" : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <Lock size={18} /> Change Password
          </button>
          <button
            onClick={() => setActiveTab("logout")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium ${
              activeTab === "logout" ? "bg-red-600 text-white" : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <LogOut size={18} /> Logout
          </button>
        </aside>

        {/* Content */}
        <section className="flex-1 bg-white rounded-xl shadow-md p-6">
          {/* BASIC */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                <User className="w-5 h-5" /> Basic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm text-gray-600">
                  Full Name
                  <input
                    className="mt-1 w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    value={user.name || ""}
                    onChange={(e) => setUser({ ...user, name: e.target.value })}
                    placeholder="Full Name"
                  />
                </label>
                <label className="text-sm text-gray-600">
                  Email
                  <input
                    className="mt-1 w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    value={user.email || ""}
                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                    placeholder="Email"
                  />
                </label>
                <label className="text-sm text-gray-600">
                  Contact Number
                  <input
                    className="mt-1 w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    value={user.contact || ""}
                    onChange={(e) => setUser({ ...user, contact: e.target.value })}
                    placeholder="Contact Number"
                  />
                </label>
                <label className="text-sm text-gray-600">
                  Shop / Business Name
                  <input
                    className="mt-1 w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    value={user.shopName || ""}
                    onChange={(e) => setUser({ ...user, shopName: e.target.value })}
                    placeholder="Shop / Business Name"
                  />
                </label>
                <label className="text-sm text-gray-600 md:col-span-2">
                  Shop Address
                  <input
                    className="mt-1 w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    value={user.shopAddress || ""}
                    onChange={(e) => setUser({ ...user, shopAddress: e.target.value })}
                    placeholder="Shop Address"
                  />
                </label>
              </div>
              <button
                onClick={updateProfile}
                disabled={loading || !isChanged}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow disabled:opacity-50"
              >
                {loading ? "Saving..." : "💾 Save Changes"}
              </button>
            </div>
          )}

          {/* BILLING */}
          {activeTab === "billing" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                  <FileText className="w-5 h-5" /> Bill Details (for Invoice Generation)
                </h2>
                {billSaved && !editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-gray-700 inline-flex items-center gap-2 px-3 py-1 rounded text-sm border hover:bg-gray-50"
                  >
                    <Edit3 size={16} /> Edit
                  </button>
                )}
              </div>
              {!editMode && billSaved ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid md:grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Seller</div>
                      <div className="font-medium text-gray-800">{bill.sellerName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">GST Number</div>
                      <div className="font-medium text-gray-800">{bill.gstNumber || "—"}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-gray-500">Full Address</div>
                      <div className="text-sm text-gray-800">{bill.fullAddress || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Slogan</div>
                      <div className="text-sm text-gray-800">{bill.slogan || "—"}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-gray-500">Assets</div>
                      <div className="flex items-center gap-4 mt-2">
                        {bill.logoUrl ? (
                          <img src={bill.logoUrl} alt="Logo" className="h-12 object-contain rounded" />
                        ) : (
                          <div className="h-12 w-32 bg-white border flex items-center justify-center text-xs text-gray-400">No Logo</div>
                        )}
                        {bill.qrCodeUrl ? (
                          <img src={bill.qrCodeUrl} alt="QR" className="h-16 w-16 object-contain rounded" />
                        ) : (
                          <div className="h-16 w-16 bg-white border flex items-center justify-center text-xs text-gray-400">No QR</div>
                        )}
                        {bill.signatureUrl ? (
                          <img src={bill.signatureUrl} alt="Signature" className="h-12 object-contain rounded" />
                        ) : (
                          <div className="h-12 w-40 bg-white border flex items-center justify-center text-xs text-gray-400">No Signature</div>
                        )}
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
                      Name of the Seller *
                      <input
                        className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                        value={bill.sellerName || ""}
                        onChange={(e) => setBill((b) => ({ ...b, sellerName: e.target.value }))}
                        placeholder="Seller / Supplier Name"
                      />
                    </label>
                    <label className="text-sm text-gray-600">
                      GST Number *
                      <input
                        className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                        value={bill.gstNumber || ""}
                        onChange={(e) => setBill((b) => ({ ...b, gstNumber: e.target.value }))}
                        placeholder="e.g., 24ABCDE1234F1Z5"
                      />
                    </label>
                    <label className="text-sm text-gray-600 md:col-span-2">
                      Full Address of the Supplier *
                      <textarea
                        className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                        value={bill.fullAddress || ""}
                        onChange={(e) => setBill((b) => ({ ...b, fullAddress: e.target.value }))}
                        placeholder="Street, Area, City, State, Pincode"
                        rows={3}
                      />
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">Logo (optional) — ~300×120 px, ≤ 200 KB</div>
                        {bill.logoUrl ? (
                          <a href={bill.logoUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">
                            Preview
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
                        className="w-full border rounded-lg p-2 bg-white"
                        disabled={uploading.logo}
                      />
                      {uploading.logo && <p className="text-xs text-gray-500">Uploading logo...</p>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">QR Code (required) — 300×300 px, ≤ 250 KB</div>
                        {bill.qrCodeUrl ? (
                          <a href={bill.qrCodeUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">
                            Preview
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
                        className="w-full border rounded-lg p-2 bg-white"
                        disabled={uploading.qr}
                      />
                      {uploading.qr && <p className="text-xs text-gray-500">Uploading QR code...</p>}
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">Signature of the Supplier (required) — ~300×120 px, ≤ 200 KB</div>
                        {bill.signatureUrl ? (
                          <a href={bill.signatureUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">
                            Preview
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
                        className="w-full border rounded-lg p-2 bg-white"
                        disabled={uploading.sig}
                      />
                      {uploading.sig && <p className="text-xs text-gray-500">Uploading signature...</p>}
                    </div>
                    <label className="text-sm text-gray-600 md:col-span-2">
                      Slogan (appears in bill footer) *
                      <input
                        className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                        value={bill.slogan || ""}
                        onChange={(e) => setBill((b) => ({ ...b, slogan: e.target.value }))}
                        placeholder="Thank you for choosing <Your Shop Name>!"
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={saveBillDetails}
                      disabled={saveLoading || !isBillDirty}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded text-white ${saveLoading ? "bg-purple-400" : isBillDirty ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-300 cursor-not-allowed"}`}
                    >
                      {saveLoading ? "Saving..." : billSaved ? "Update Bill Details" : "Save Bill Details"}
                    </button>
                    {editMode && (
                      <button
                        onClick={cancelBillEdit}
                        className="text-gray-700  px-3 py-2 rounded border hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                    <div className="text-xs text-gray-500">
                      {billSaved ? "Saved to database. Click Edit to modify." : "Fill required fields and save to store billing info."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BANK */}
          {activeTab === "bank" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">🏦 Bank Details</h2>
                {bankSaved && !bankEditMode && (
                  <button
                    onClick={() => setBankEditMode(true)}
                    className="text-gray-700  inline-flex items-center gap-2 px-3 py-1 rounded text-sm border hover:bg-gray-50"
                  >
                    <Edit3 size={16} /> Edit
                  </button>
                )}
              </div>
              {!bankEditMode && bankSaved ? (
  <div className="border rounded-lg p-4 bg-white shadow-sm grid md:grid-cols-2 gap-4">
    <div>
      <div className="text-sm font-medium text-gray-600">Bank Name</div>
      <div className="text-base font-semibold text-gray-900">{bank.bankName || "—"}</div>
    </div>
    <div>
      <div className="text-sm font-medium text-gray-600">IFSC Code</div>
      <div className="text-base font-semibold text-gray-900">{bank.ifscCode || "—"}</div>
    </div>
    <div>
      <div className="text-sm font-medium text-gray-600">Branch Name</div>
      <div className="text-base font-semibold text-gray-900">{bank.branchName || "—"}</div>
    </div>
    <div>
      <div className="text-sm font-medium text-gray-600">Banking Name</div>
      <div className="text-base font-semibold text-gray-900">{bank.bankingName || "—"}</div>
    </div>
    <div className="md:col-span-2">
      <div className="text-sm font-medium text-gray-600">Account Number</div>
      <div className="text-base font-semibold text-gray-900">{bank.accountNumber || "—"}</div>
    </div>
  </div>
) : (
  <div className="border rounded-lg p-4 bg-gray-50 grid md:grid-cols-2 gap-4">
    <input
      className="border p-3 rounded-lg text-gray-900 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-indigo-500"
      placeholder="Bank Name"
      value={bank.bankName}
      onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
    />
    <input
      className="border p-3 rounded-lg text-gray-900 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-indigo-500"
      placeholder="IFSC Code"
      value={bank.ifscCode}
      onChange={(e) => setBank({ ...bank, ifscCode: e.target.value })}
    />
    <input
      className="border p-3 rounded-lg text-gray-900 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-indigo-500"
      placeholder="Branch Name"
      value={bank.branchName}
      onChange={(e) => setBank({ ...bank, branchName: e.target.value })}
    />
    <input
      className="border p-3 rounded-lg text-gray-900 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-indigo-500"
      placeholder="Banking Name"
      value={bank.bankingName}
      onChange={(e) => setBank({ ...bank, bankingName: e.target.value })}
    />
    <input
      className="border p-3 rounded-lg text-gray-900 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-indigo-500 md:col-span-2"
      placeholder="Account Number"
      value={bank.accountNumber}
      onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
    />
    <button
      onClick={saveBankDetails}
      disabled={bankLoading}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow-md md:col-span-2"
    >
      {bankLoading ? "Saving..." : bankSaved ? "Update Bank Details" : "Save Bank Details"}
    </button>
  </div>
)}

            </div>
          )}

          {/* PASSWORD */}
          {activeTab === "password" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                <Lock className="w-5 h-5" /> Change Password
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm text-gray-600">
                  Old Password
                  <input
                    className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
                    placeholder="Old Password"
                  />
                </label>
                <label className="text-sm text-gray-600">
                  New Password
                  <input
                    className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="New Password"
                  />
                </label>
              </div>
              <button onClick={changePassword} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow disabled:opacity-50">
                {loading ? "Updating..." : "🔑 Change Password"}
              </button>
            </div>
          )}

          {/* LOGOUT */}
          {activeTab === "logout" && (
            <div className="flex flex-col items-center justify-center gap-4">
              <h2 className="text-xl font-semibold text-gray-800">Ready to leave?</h2>
              <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow">
                🚪 Logout
              </button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
