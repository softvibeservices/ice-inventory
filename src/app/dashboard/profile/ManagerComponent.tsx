// icecream-inventory\src\app\dashboard\profile\ManagerComponent.tsx
"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { UserPlus, Lock, Trash2, X, Users } from "lucide-react";

export default function ManagerComponent({ adminId }: any) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
    confirm: "",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [deletingManagerName, setDeletingManagerName] = useState("");

  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [selectedManagerName, setSelectedManagerName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passForm, setPassForm] = useState({
    password: "",
    confirm: "",
  });

  const load = async () => {
    try {
      const res = await fetch(`/api/manager?adminId=${adminId}`);
      const data = await res.json();
      if (res.ok) setList(data);
    } catch (error) {
      toast.error("Failed to load managers");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name || !form.email || !form.contact || !form.password) {
      return toast.error("Please fill all fields");
    }

    if (form.password !== form.confirm) {
      return toast.error("Passwords do not match");
    }

    setIsSaving(true);
    const loadingToast = toast.loading("Saving...");

    try {
      const res = await fetch("/api/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, ...form }),
      });

      const data = await res.json();
      toast.dismiss(loadingToast);

      if (!res.ok) {
        setIsSaving(false);
        return toast.error(data.error);
      }

      toast.success("Manager added successfully! ✅");

      setForm({
        name: "",
        email: "",
        contact: "",
        password: "",
        confirm: "",
      });

      load();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to add manager");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string, name: string) => {
    setDeleteId(id);
    setDeletingManagerName(name);
    setShowDeleteConfirm(true);
  };

  const del = async () => {
    const loadingToast = toast.loading("Deleting...");

    try {
      await fetch("/api/manager", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId, adminId }),
      });

      toast.dismiss(loadingToast);
      toast.success("Manager deleted! 🗑️");

      setShowDeleteConfirm(false);
      setDeleteId("");
      setDeletingManagerName("");
      load();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to delete manager");
    }
  };

  const sendOTP = async () => {
    setIsOtpSending(true);

    try {
      const res = await fetch("/api/manager/request-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId: selectedManagerId, adminId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsOtpSending(false);
        return toast.error(data.error);
      }

      toast.success("OTP sent to admin email! 📧");
      setOtpSent(true);
    } catch (error) {
      toast.error("Failed to send OTP");
    } finally {
      setIsOtpSending(false);
    }
  };

  const changeManagerPassword = async () => {
    if (passForm.password !== passForm.confirm) {
      return toast.error("Passwords do not match");
    }

    if (!otpValue.trim()) {
      return toast.error("Please enter OTP");
    }

    const loadingToast = toast.loading("Updating password...");

    try {
      const res = await fetch("/api/manager/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: selectedManagerId,
          otp: otpValue.trim(),
          password: passForm.password,
          adminId,
        }),
      });

      const data = await res.json();
      toast.dismiss(loadingToast);

      if (!res.ok) return toast.error(data.error);

      toast.success("Password updated! 🔑");

      setShowPassModal(false);
      setOtpSent(false);
      setOtpValue("");
      setPassForm({ password: "", confirm: "" });
      setSelectedManagerName("");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to update password");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="w-6 h-6 text-orange-600" />
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          Manager Management
        </h2>
      </div>

      {/* Add Manager Form */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 sm:p-6 border border-orange-100">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <UserPlus size={20} className="text-orange-600" />
          Add New Manager
        </h3>

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
            placeholder="Contact Number *"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <input
            className="border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            placeholder="Password *"
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

        <button
          onClick={save}
          disabled={isSaving}
          className="mt-4 w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Saving...
            </>
          ) : (
            <>
              <UserPlus size={18} />
              Save Manager
            </>
          )}
        </button>
      </div>

      {/* Manager List */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Users size={20} />
          Manager List {list.length > 0 && `(${list.length})`}
        </h3>

        {list.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No managers added yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Add your first manager using the form above
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">
                      Contact
                    </th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((m: any) => (
                    <tr
                      key={m._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-4 text-gray-800 font-medium">
                        {m.name}
                      </td>
                      <td className="p-4 text-gray-600">{m.email}</td>
                      <td className="p-4 text-gray-600">{m.contact}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedManagerId(m._id);
                            setSelectedManagerName(m.name);
                            setShowPassModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 text-sm font-medium"
                        >
                          <Lock size={14} />
                          Change Password
                        </button>

                        <button
                          onClick={() => confirmDelete(m._id, m.name)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 text-sm font-medium"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {list.map((m: any) => (
                <div
                  key={m._id}
                  className="bg-white border rounded-lg p-4 space-y-3"
                >
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Name</div>
                    <div className="font-semibold text-gray-800">{m.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Email</div>
                    <div className="text-sm text-gray-700 break-all">
                      {m.email}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Contact</div>
                    <div className="text-sm text-gray-700">{m.contact}</div>
                  </div>
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <button
                      onClick={() => {
                        setSelectedManagerId(m._id);
                        setSelectedManagerName(m.name);
                        setShowPassModal(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Lock size={16} />
                      Change Password
                    </button>

                    <button
                      onClick={() => confirmDelete(m._id, m.name)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Trash2 size={16} />
                      Delete Manager
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Delete
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{deletingManagerName}</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteId("");
                  setDeletingManagerName("");
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={del}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Delete Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Change Password
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedManagerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPassModal(false);
                  setOtpSent(false);
                  setOtpValue("");
                  setPassForm({ password: "", confirm: "" });
                  setSelectedManagerName("");
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {!otpSent ? (
                <>
                  <p className="text-sm text-gray-600">
                    An OTP will be sent to your admin email address. Click
                    below to receive it.
                  </p>
                  <button
                    onClick={sendOTP}
                    disabled={isOtpSending}
                    className="w-full px-5 py-3 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isOtpSending ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Sending OTP...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Enter OTP *
                    </label>
                    <input
                      className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="6-digit OTP"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value)}
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      New Password *
                    </label>
                    <input
                      className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="New Password"
                      type="password"
                      value={passForm.password}
                      onChange={(e) =>
                        setPassForm({ ...passForm, password: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Confirm Password *
                    </label>
                    <input
                      className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Confirm Password"
                      type="password"
                      value={passForm.confirm}
                      onChange={(e) =>
                        setPassForm({ ...passForm, confirm: e.target.value })
                      }
                    />
                  </div>

                  <button
                    onClick={changeManagerPassword}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg font-medium transition-colors"
                  >
                    Update Password
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setShowPassModal(false);
                  setOtpSent(false);
                  setOtpValue("");
                  setPassForm({ password: "", confirm: "" });
                  setSelectedManagerName("");
                }}
                className="w-full px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
