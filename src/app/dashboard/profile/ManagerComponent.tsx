"use client";
// src/app/dashboard/profile/ManagerComponent.tsx

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  X,
  Monitor,
  Smartphone,
  Laptop,
  ChevronDown,
  ChevronUp,
  ShieldOff,
  ShieldCheck,
  Shield,
  Clock,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react";
import type { ManagerDevice, DeviceStatus } from "@/types/profile.types";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
interface Manager {
  _id: string;
  name: string;
  email: string;
  contact: string;
  status: "pending" | "approved" | "rejected" | "blocked";
}

interface ManagerWithDevices extends Manager {
  devices?: ManagerDevice[];
  devicesLoaded?: boolean;
  devicesLoading?: boolean;
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function getPlatformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("android") || p.includes("iphone") || p.includes("ipad"))
    return <Smartphone size={14} />;
  if (p.includes("windows") || p.includes("macos") || p.includes("linux"))
    return <Laptop size={14} />;
  return <Monitor size={14} />;
}

function getDeviceStatusStyle(status: DeviceStatus) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 border-green-200";
    case "banned":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getDeviceStatusIcon(status: DeviceStatus) {
  switch (status) {
    case "active":
      return <CheckCircle2 size={11} />;
    case "banned":
      return <XCircle size={11} />;
    default:
      return <Clock size={11} />;
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─────────────────────────────────────────────
//  Confirm modal for device actions
// ─────────────────────────────────────────────
function DeviceConfirmModal({
  deviceLabel,
  action,
  onConfirm,
  onClose,
}: {
  deviceLabel: string;
  action: "ban" | "remove";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const isBan = action === "ban";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBan ? "bg-red-100" : "bg-gray-100"}`}>
            {isBan ? <ShieldOff className="w-5 h-5 text-red-600" /> : <Trash2 className="w-5 h-5 text-gray-600" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{isBan ? "Ban Device" : "Remove Session"}</h3>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{deviceLabel}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          {isBan
            ? "This device will be banned. The manager's session on this device will be terminated immediately. You can unban it later."
            : "This device will be logged out and removed from the list. The manager will need to log in again on that device."}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors ${isBan ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-800"}`}
          >
            {isBan ? "Ban Device" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
export default function ManagerComponent({ adminId }: { adminId: string }) {
  const [list, setList] = useState<ManagerWithDevices[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Add manager form
  const [showAddForm, setShowAddForm] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [pendingManagerData, setPendingManagerData] = useState<{
    name: string;
    email: string;
    contact: string;
    password: string;
  } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", contact: "", password: "", confirm: "" });
  const [otpForNewManager, setOtpForNewManager] = useState("");
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [deletingManagerName, setDeletingManagerName] = useState("");

  // Block confirm
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockingManager, setBlockingManager] = useState<Manager | null>(null);

  // Device management
  const [expandedManagerId, setExpandedManagerId] = useState<string | null>(null);
  const [deviceActionLoading, setDeviceActionLoading] = useState<string | null>(null);
  const [deviceConfirmModal, setDeviceConfirmModal] = useState<{
    managerId: string;
    device: ManagerDevice;
    action: "ban" | "remove";
  } | null>(null);

  // ─── Fetch managers ───
  const load = async () => {
    setLoadingList(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/manager", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load managers");
        return;
      }
      setList(data.map((m: Manager) => ({ ...m, devicesLoaded: false })));
    } catch {
      toast.error("Failed to load managers");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ─── Toggle + load devices for a manager ───
  const toggleManagerDevices = async (managerId: string) => {
    if (expandedManagerId === managerId) {
      setExpandedManagerId(null);
      return;
    }
    setExpandedManagerId(managerId);
    const mgr = list.find((m) => m._id === managerId);
    if (mgr?.devicesLoaded) return;

    setList((prev) =>
      prev.map((m) => m._id === managerId ? { ...m, devicesLoading: true } : m)
    );
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/manager/devices?managerId=${managerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load devices");
        setList((prev) =>
          prev.map((m) => m._id === managerId ? { ...m, devicesLoading: false } : m)
        );
        return;
      }
      setList((prev) =>
        prev.map((m) =>
          m._id === managerId
            ? { ...m, devices: data.devices, devicesLoaded: true, devicesLoading: false }
            : m
        )
      );
    } catch {
      toast.error("Failed to load devices");
      setList((prev) =>
        prev.map((m) => m._id === managerId ? { ...m, devicesLoading: false } : m)
      );
    }
  };

  // ─── Refresh devices for a manager ───
  const refreshDevices = async (managerId: string) => {
    setList((prev) =>
      prev.map((m) => m._id === managerId ? { ...m, devicesLoading: true } : m)
    );
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/manager/devices?managerId=${managerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setList((prev) =>
          prev.map((m) =>
            m._id === managerId
              ? { ...m, devices: data.devices, devicesLoaded: true, devicesLoading: false }
              : m
          )
        );
      }
    } catch {
      setList((prev) =>
        prev.map((m) => m._id === managerId ? { ...m, devicesLoading: false } : m)
      );
    }
  };

  // ─── Device action: ban / unban / remove ───
  const handleDeviceAction = async (
    managerId: string,
    deviceId: string,
    action: "ban" | "unban" | "remove"
  ) => {
    const key = managerId + deviceId + action;
    setDeviceActionLoading(key);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/manager/devices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ managerId, deviceId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(data.message || "Done ✓");
      setDeviceConfirmModal(null);
      await refreshDevices(managerId);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeviceActionLoading(null);
    }
  };

  // ─── Block/Unblock manager account ───
  const handleManagerStatusAction = async (
    managerId: string,
    action: "block" | "unblock"
  ) => {
    try {
      const token = localStorage.getItem("token");
      const loadingToast = toast.loading(
        action === "block" ? "Blocking manager..." : "Unblocking manager..."
      );
      const res = await fetch("/api/manager", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: managerId, action }),
      });
      const data = await res.json();
      toast.dismiss(loadingToast);
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(data.message || "Done ✓");
      setShowBlockConfirm(false);
      setBlockingManager(null);
      await load();
    } catch {
      toast.error("Something went wrong");
    }
  };

  // ─── OTP / Add manager flow ───
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm({ ...form, contact: val });
  };

  const sendOtpToManagerEmail = async () => {
    if (!form.name || !form.email || !form.contact || !form.password) {
      toast.error("Please fill all fields");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (form.contact.length !== 10) {
      toast.error("Contact must be 10 digits");
      return;
    }

    setIsOtpSending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/manager/send-verification-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: form.email, name: form.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send OTP");
        return;
      }
      toast.success("OTP sent to manager's email 📧");
      setPendingManagerData({ name: form.name, email: form.email, contact: form.contact, password: form.password });
      setShowAddForm(false);
      setShowOtpVerification(true);
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setIsOtpSending(false);
    }
  };

  const cancelOtpVerification = () => {
    setShowOtpVerification(false);
    setPendingManagerData(null);
    setOtpForNewManager("");
    setForm({ name: "", email: "", contact: "", password: "", confirm: "" });
  };

  const verifyOtpAndSaveManager = async () => {
    if (!pendingManagerData || otpForNewManager.length !== 6) return;
    setIsVerifyingOtp(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...pendingManagerData, otp: otpForNewManager }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create manager");
        return;
      }
      toast.success("Manager created successfully 🎉");
      setShowOtpVerification(false);
      setPendingManagerData(null);
      setOtpForNewManager("");
      setForm({ name: "", email: "", contact: "", password: "", confirm: "" });
      await load();
    } catch {
      toast.error("Failed to create manager");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ─── Delete manager ───
  const confirmDelete = (id: string, name: string) => {
    setDeleteId(id);
    setDeletingManagerName(name);
    setShowDeleteConfirm(true);
  };

  const del = async () => {
    if (!deleteId) return;
    const loadingToast = toast.loading("Deleting manager...");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/manager", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: deleteId }),
      });
      const data = await res.json();
      toast.dismiss(loadingToast);
      if (!res.ok) {
        toast.error(data.error || "Delete failed");
        return;
      }
      toast.success("Manager deleted and sessions cleared ✓");
      setShowDeleteConfirm(false);
      setDeleteId("");
      setDeletingManagerName("");
      await load();
    } catch {
      toast.dismiss(loadingToast);
      toast.error("Failed to delete manager");
    }
  };

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-orange-600" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            Manager Management
          </h2>
        </div>
        {!showAddForm && !showOtpVerification && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary btn-sm"
          >
            <UserPlus size={16} />
            Add Manager
          </button>
        )}
      </div>

      {/* Add Manager Form */}
      {showAddForm && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 sm:p-6 border border-orange-100 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <UserPlus size={20} className="text-orange-600" />
              Add New Manager
            </h3>
            <button
              onClick={() => { setShowAddForm(false); setForm({ name: "", email: "", contact: "", password: "", confirm: "" }); }}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              className="border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="Full Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="Email *"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="Contact Number (10 digits) *"
              type="tel"
              value={form.contact}
              onChange={handleContactChange}
              maxLength={10}
            />
            <input
              className="border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="Password (min 6 characters) *"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <input
              className="border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all sm:col-span-2"
              placeholder="Confirm Password *"
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>
          {form.password && form.confirm && (
            <div className={`mt-3 p-2 rounded-lg text-sm ${form.password === form.confirm ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {form.password === form.confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
            </div>
          )}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 flex items-center gap-2">
              <Mail size={14} />
              An OTP will be sent to the manager's email for verification before account creation.
            </p>
          </div>
          <button
            onClick={sendOtpToManagerEmail}
            disabled={isOtpSending}
            className="btn btn-primary mt-4"
          >
            {isOtpSending ? (
              <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending OTP...</>
            ) : (
              <><Mail size={18} />Send Verification OTP</>
            )}
          </button>
        </div>
      )}

      {/* OTP Verification */}
      {showOtpVerification && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Mail size={20} className="text-blue-600" />
              Email Verification
            </h3>
            <button onClick={cancelOtpVerification} className="text-gray-500 hover:text-gray-700 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-white border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Manager Email:</strong> {pendingManagerData?.email}
              </p>
              <p className="text-xs text-gray-600">A 6-digit OTP has been sent to this email. Please enter it below.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Enter OTP *</label>
              <input
                className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-lg tracking-widest"
                placeholder="000000"
                value={otpForNewManager}
                onChange={(e) => setOtpForNewManager(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                type="tel"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={verifyOtpAndSaveManager}
                disabled={isVerifyingOtp || otpForNewManager.length !== 6}
                className="btn btn-success flex-1"
              >
                {isVerifyingOtp
                  ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Verifying...</>
                  : <><UserPlus size={18} />Verify & Add Manager</>}
              </button>
              <button
                onClick={sendOtpToManagerEmail}
                disabled={isOtpSending}
                className="btn btn-secondary"
              >
                {isOtpSending
                  ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Resending...</>
                  : <><Mail size={18} />Resend OTP</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager List */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Users size={20} />
          Manager List {list.length > 0 && `(${list.length})`}
        </h3>

        {loadingList ? (
          <div className="flex justify-center py-8">
            <span className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No managers added yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your first manager using the button above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((m) => {
              const isExpanded = expandedManagerId === m._id;

              return (
                <div
                  key={m._id}
                  className={`border rounded-xl transition-all ${m.status === "blocked" ? "border-red-200 bg-red-50/30" : "border-gray-200 bg-white"}`}
                >
                  {/* Manager Info Row */}
                  <div className="p-4 flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{m.name}</span>
                        {m.status === "blocked" && (
                          <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Ban size={11} />Blocked
                          </span>
                        )}
                        {m.status === "approved" && (
                          <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={11} />Active
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">{m.email} · {m.contact}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.status === "blocked" ? (
                        <button
                          onClick={() => handleManagerStatusAction(m._id, "unblock")}
                          className="btn btn-success btn-sm"
                        >
                          <Shield size={13} />Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => { setBlockingManager(m); setShowBlockConfirm(true); }}
                          className="btn btn-warning btn-sm"
                        >
                          <ShieldOff size={13} />Block
                        </button>
                      )}
                      <button
                        onClick={() => confirmDelete(m._id, m.name)}
                        className="btn btn-danger btn-sm"
                      >
                        <Trash2 size={13} />Delete
                      </button>
                      <button
                        onClick={() => toggleManagerDevices(m._id)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Monitor size={13} />
                        Devices
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Device Section */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Monitor size={15} className="text-blue-600" />
                          Logged-in Devices
                        </h4>
                        <button
                          onClick={() => refreshDevices(m._id)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <RefreshCw size={12} />Refresh
                        </button>
                      </div>

                      {m.devicesLoading ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                          <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          Loading devices...
                        </div>
                      ) : !m.devices || m.devices.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          <Monitor size={28} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-400">No devices logged in yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                            <p className="text-xs text-blue-800 flex items-start gap-1.5">
                              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                              <span>
                                <strong>Ban</strong> — blocks the device and terminates its session (reversible). ·{" "}
                                <strong>Remove Session</strong> — logs out and deletes the device record permanently.
                              </span>
                            </p>
                          </div>

                          {m.devices.map((device) => {
                            const actionKey = m._id + device.deviceId;
                            const isActioning = deviceActionLoading?.startsWith(actionKey);

                            return (
                              <div key={device.deviceId} className="border border-gray-200 rounded-lg p-3 bg-white">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Device Icon */}
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${device.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {getPlatformIcon(device.platform)}
                                  </div>

                                  {/* Device Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium text-gray-800">{device.label}</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${getDeviceStatusStyle(device.status)}`}>
                                        {getDeviceStatusIcon(device.status)}
                                        {device.status === "active" ? "Active" : "Banned"}
                                      </span>
                                    </div>
                                    <div className="flex gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                                      <span className="flex items-center gap-1"><Clock size={10} />{timeAgo(device.lastSeen)}</span>
                                      <span className="flex items-center gap-1"><MapPin size={10} />{device.ip}</span>
                                    </div>
                                  </div>

                                  {/* Device Action Buttons — only 2 */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* BAN / UNBAN toggle */}
                                    {device.status === "active" ? (
                                      <button
                                        disabled={!!isActioning}
                                        onClick={() => setDeviceConfirmModal({ managerId: m._id, device, action: "ban" })}
                                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                                        title="Ban this device"
                                      >
                                        <ShieldOff size={11} />Ban
                                      </button>
                                    ) : (
                                      <button
                                        disabled={!!isActioning}
                                        onClick={() => handleDeviceAction(m._id, device.deviceId, "unban")}
                                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                                        title="Unban this device"
                                      >
                                        <ShieldCheck size={11} />Unban
                                      </button>
                                    )}

                                    {/* REMOVE SESSION */}
                                    <button
                                      disabled={!!isActioning}
                                      onClick={() => setDeviceConfirmModal({ managerId: m._id, device, action: "remove" })}
                                      className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                                      title="Remove session"
                                    >
                                      <Trash2 size={11} />Remove
                                    </button>

                                    {isActioning && (
                                      <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Block Manager Confirmation Modal */}
      {showBlockConfirm && blockingManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fadeIn">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <ShieldOff className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Block Manager</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to block{" "}
                  <span className="font-semibold">{blockingManager.name}</span>?
                  All their active sessions will be terminated immediately.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6">
              <button
                onClick={() => { setShowBlockConfirm(false); setBlockingManager(null); }}
                className="btn btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={() => handleManagerStatusAction(blockingManager._id, "block")}
                className="btn btn-warning w-full sm:w-auto"
              >
                Block Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fadeIn">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{deletingManagerName}</span>?
                  This will also delete all their sessions. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteId(""); setDeletingManagerName(""); }}
                className="btn btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={del}
                className="btn btn-danger w-full sm:w-auto"
              >
                Delete Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Confirm Modal */}
      {deviceConfirmModal && (
        <DeviceConfirmModal
          deviceLabel={deviceConfirmModal.device.label}
          action={deviceConfirmModal.action}
          onClose={() => setDeviceConfirmModal(null)}
          onConfirm={() =>
            handleDeviceAction(
              deviceConfirmModal.managerId,
              deviceConfirmModal.device.deviceId,
              deviceConfirmModal.action
            )
          }
        />
      )}
    </div>
  );
}