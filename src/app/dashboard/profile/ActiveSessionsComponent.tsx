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
  ShieldAlert,
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
    case "blocked":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "banned":
      return "bg-red-100 text-red-700 border-red-200";
  }
}

function getStatusIcon(status: DeviceStatus) {
  switch (status) {
    case "active":
      return <CheckCircle2 size={13} />;
    case "blocked":
      return <Clock size={13} />;
    case "banned":
      return <XCircle size={13} />;
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
//  Block-Until Modal
// ─────────────────────────────────────────────
function BlockUntilModal({
  device,
  onConfirm,
  onClose,
}: {
  device: Device;
  onConfirm: (date: string) => void;
  onClose: () => void;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow.toISOString().split("T")[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Block Until Date</h3>
            <p className="text-xs text-gray-500">{device.label}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          The device will be blocked and the session on it will be terminated
          until the selected date.
        </p>
        <label className="text-sm text-gray-700 font-medium block mb-1">
          Block Until
        </label>
        <input
          type="date"
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          value={date}
          min={tomorrow.toISOString().split("T")[0]}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(date)}
            className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
          >
            Block Device
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
  const [blockModal, setBlockModal] = useState<Device | null>(null);
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
    action: "ban" | "block" | "unblock" | "delete",
    blockedUntil?: string
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
        body: JSON.stringify({ deviceId, action, blockedUntil }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(data.message || "Done ✓");
      setBlockModal(null);
      await fetchDevices();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const activeCount = devices.filter((d) => d.status === "active").length;
  const bannedCount = devices.filter((d) => d.status === "banned").length;
  const blockedCount = devices.filter((d) => d.status === "blocked").length;

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
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{activeCount}</p>
          <p className="text-xs text-green-600 mt-0.5">Active</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-700">{blockedCount}</p>
          <p className="text-xs text-yellow-600 mt-0.5">Blocked</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{bannedCount}</p>
          <p className="text-xs text-red-600 mt-0.5">Banned</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          Each entry represents a unique browser/device that has logged into
          your account. Banning or blocking a device will immediately terminate
          its active session.
        </p>
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
                        : device.status === "blocked"
                        ? "bg-yellow-100 text-yellow-700"
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
                        {device.status.charAt(0).toUpperCase() +
                          device.status.slice(1)}
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
                        <span className="font-medium text-gray-700">
                          Browser:
                        </span>{" "}
                        {device.browser}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Platform:
                        </span>{" "}
                        {device.platform}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          First Seen:
                        </span>{" "}
                        {formatDate(device.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Last Active:
                        </span>{" "}
                        {formatDate(device.lastSeen)}
                      </div>
                      {device.status === "blocked" && device.blockedUntil && (
                        <div className="sm:col-span-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                          <span className="font-medium text-yellow-700">
                            Blocked Until:
                          </span>{" "}
                          <span className="text-yellow-800">
                            {formatDate(device.blockedUntil)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {device.status === "active" && !device.isCurrent && (
                        <>
                          <button
                            disabled={!!isActioning}
                            onClick={() =>
                              handleAction(device.deviceId, "ban")
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <ShieldOff size={13} />
                            Ban Device
                          </button>
                          <button
                            disabled={!!isActioning}
                            onClick={() => setBlockModal(device)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <Clock size={13} />
                            Block Until
                          </button>
                        </>
                      )}

                      {(device.status === "blocked" ||
                        device.status === "banned") && (
                        <button
                          disabled={!!isActioning}
                          onClick={() =>
                            handleAction(device.deviceId, "unblock")
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <Shield size={13} />
                          Restore Access
                        </button>
                      )}

                      {!device.isCurrent && (
                        <button
                          disabled={!!isActioning}
                          onClick={() =>
                            handleAction(device.deviceId, "delete")
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          Remove Session
                        </button>
                      )}

                      {device.isCurrent && (
                        <p className="text-xs text-blue-600 italic flex items-center gap-1">
                          <ShieldAlert size={13} />
                          This is your current session — you cannot ban or block
                          it.
                        </p>
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

      {/* Block Until Modal */}
      {blockModal && (
        <BlockUntilModal
          device={blockModal}
          onClose={() => setBlockModal(null)}
          onConfirm={(date) =>
            handleAction(blockModal.deviceId, "block", date)
          }
        />
      )}
    </div>
  );
}