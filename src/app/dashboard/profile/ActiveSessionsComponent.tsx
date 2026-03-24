"use client";
// src/app/dashboard/profile/ActiveSessionsComponent.tsx

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Monitor,
  Smartphone,
  Laptop,
  Shield,
  ShieldOff,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Device, DeviceStatus } from "@/types/profile.types";

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function getPlatformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("android") || p.includes("iphone") || p.includes("ipad")) {
    return <Smartphone size={18} />;
  }
  if (p.includes("windows") || p.includes("macos") || p.includes("linux")) {
    return <Laptop size={18} />;
  }
  return <Monitor size={18} />;
}

function getStatusColor(status: DeviceStatus) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 border-green-200";
    case "banned":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getStatusIcon(status: DeviceStatus) {
  switch (status) {
    case "active":
      return <CheckCircle2 size={13} />;
    case "banned":
      return <XCircle size={13} />;
    default:
      return <Clock size={13} />;
  }
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─────────────────────────────────────────────
//  Confirm Modal (shared for ban & remove)
// ─────────────────────────────────────────────
function ConfirmModal({
  device,
  action,
  onConfirm,
  onClose,
}: {
  device: Device;
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
            {isBan
              ? <ShieldOff className="w-5 h-5 text-red-600" />
              : <Trash2 className="w-5 h-5 text-gray-600" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isBan ? "Ban Device" : "Remove Session"}
            </h3>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{device.label}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-5">
          {isBan
            ? "This device will be banned and immediately logged out. You can unban it later from this page."
            : "This device will be logged out and removed from the list. The user will need to log in again on that device."}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors ${
              isBan
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-700 hover:bg-gray-800"
            }`}
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
export default function ActiveSessionsComponent() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    device: Device;
    action: "ban" | "remove";
  } | null>(null);
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/profile/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load sessions");
        return;
      }
      setDevices(data);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAction = async (
    deviceId: string,
    action: "ban" | "unban" | "remove"
  ) => {
    setActionLoading(deviceId + action);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/profile/devices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(data.message || "Done ✓");
      setConfirmModal(null);
      await fetchDevices();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const activeCount = devices.filter((d) => d.status === "active").length;
  const bannedCount = devices.filter((d) => d.status === "banned").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            Active Sessions
          </h2>
        </div>
        <button
          onClick={fetchDevices}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{activeCount}</p>
          <p className="text-xs text-green-600 mt-0.5">Active</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{bannedCount}</p>
          <p className="text-xs text-red-600 mt-0.5">Banned</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-800 space-y-1">
          <p>Each entry represents a unique browser/device that has logged into your account.</p>
          <p>
            <strong>Ban</strong> — Blocks the device and logs it out. Can be unbanned later. ·{" "}
            <strong>Remove Session</strong> — Logs out that device and removes it from this list permanently.
          </p>
        </div>
      </div>

      {/* Device List */}
      {devices.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Monitor size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const isExpanded = expandedDeviceId === device.deviceId;
            const isActioning = actionLoading?.startsWith(device.deviceId);

            return (
              <div
                key={device.deviceId}
                className={`border rounded-xl transition-all ${
                  device.isCurrent
                    ? "border-blue-300 bg-blue-50/40"
                    : "border-gray-200 bg-white"
                }`}
              >
                {/* Device Header Row */}
                <div className="p-4 flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      device.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {getPlatformIcon(device.platform)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm truncate">
                        {device.label}
                      </span>
                      {device.isCurrent && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                          This Device
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${getStatusColor(
                          device.status
                        )}`}
                      >
                        {getStatusIcon(device.status)}
                        {device.status === "active" ? "Active" : "Banned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {timeAgo(device.lastSeen)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {device.ip}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setExpandedDeviceId(isExpanded ? null : device.deviceId)
                    }
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {isExpanded ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </button>
                </div>

                {/* Expanded Detail + Actions */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                    {/* Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>
                        <span className="font-medium text-gray-700">Browser:</span>{" "}
                        {device.browser}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Platform:</span>{" "}
                        {device.platform}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">First Seen:</span>{" "}
                        {formatDate(device.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Last Active:</span>{" "}
                        {formatDate(device.lastSeen)}
                      </div>
                    </div>

                    {/* Action Buttons — only 2 options */}
                    <div className="flex flex-wrap gap-2 pt-1">

                      {/* Current device — no actions allowed */}
                      {device.isCurrent ? (
                        <p className="text-xs text-blue-600 italic flex items-center gap-1">
                          <Shield size={13} />
                          This is your current session — cannot be modified.
                        </p>
                      ) : (
                        <>
                          {/* BAN / UNBAN toggle */}
                          {device.status === "active" ? (
                            <button
                              disabled={!!isActioning}
                              onClick={() => setConfirmModal({ device, action: "ban" })}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <ShieldOff size={13} />
                              Ban
                            </button>
                          ) : (
                            <button
                              disabled={!!isActioning}
                              onClick={() => handleAction(device.deviceId, "unban")}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <ShieldCheck size={13} />
                              Unban
                            </button>
                          )}

                          {/* REMOVE SESSION */}
                          <button
                            disabled={!!isActioning}
                            onClick={() => setConfirmModal({ device, action: "remove" })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                            Remove Session
                          </button>
                        </>
                      )}

                      {isActioning && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          device={confirmModal.device}
          action={confirmModal.action}
          onClose={() => setConfirmModal(null)}
          onConfirm={() => handleAction(confirmModal.device.deviceId, confirmModal.action)}
        />
      )}
    </div>
  );
}