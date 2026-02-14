// src/app/dashboard/profile/ManagerComponent.tsx

"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { UserPlus, Trash2, X, Users, Mail } from "lucide-react";

export default function ManagerComponent({ adminId }: any) {
  const [list, setList] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
    confirm: "",
  });

  // OTP verification states for new manager
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpForNewManager, setOtpForNewManager] = useState("");
  const [pendingManagerData, setPendingManagerData] = useState<any>(null);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [deletingManagerName, setDeletingManagerName] = useState("");

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

  // ✅ IMPROVED: Handle contact input (only numbers)
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Remove non-digits
    if (value.length <= 10) {
      setForm({ ...form, contact: value });
    }
  };

  // ✅ IMPROVED: Comprehensive validation
  const validateForm = (): boolean => {
    // Check if all fields are filled
    if (!form.name.trim()) {
      toast.error("Please enter manager's name");
      return false;
    }

    if (!form.email.trim()) {
      toast.error("Please enter manager's email");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    // Contact validation
    if (!form.contact.trim()) {
      toast.error("Please enter contact number");
      return false;
    }

    if (form.contact.length !== 10) {
      toast.error("Contact number must be exactly 10 digits");
      return false;
    }

    // Password validation
    if (!form.password) {
      toast.error("Please enter a password");
      return false;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return false;
    }

    if (!form.confirm) {
      toast.error("Please confirm your password");
      return false;
    }

    // ✅ FIX: Check password match
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return false;
    }

    return true;
  };

  // Step 1: Send OTP to manager's email
  const sendOtpToManagerEmail = async () => {
    // ✅ IMPROVED: Use validation function
    if (!validateForm()) {
      return;
    }

    setIsOtpSending(true);
    const loadingToast = toast.loading("Sending OTP to manager's email...");

    try {
      const res = await fetch("/api/manager/send-verification-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: form.email,
          name: form.name,
          adminId 
        }),
      });

      const data = await res.json();
      toast.dismiss(loadingToast);

      if (!res.ok) {
        setIsOtpSending(false);
        return toast.error(data.error || "Failed to send OTP");
      }

      toast.success("OTP sent to manager's email! 📧");
      
      // Store pending manager data
      setPendingManagerData({ ...form });
      setShowOtpVerification(true);
      setShowAddForm(false);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to send OTP");
    } finally {
      setIsOtpSending(false);
    }
  };

  // Step 2: Verify OTP and save manager
  const verifyOtpAndSaveManager = async () => {
    if (!otpForNewManager.trim()) {
      return toast.error("Please enter OTP");
    }

    if (otpForNewManager.length !== 6) {
      return toast.error("OTP must be 6 digits");
    }

    if (!pendingManagerData) {
      return toast.error("No pending manager data found");
    }

    setIsVerifyingOtp(true);
    const loadingToast = toast.loading("Verifying OTP and saving manager...");

    try {
      const res = await fetch("/api/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          adminId, 
          ...pendingManagerData,
          otp: otpForNewManager.trim()
        }),
      });

      const data = await res.json();
      toast.dismiss(loadingToast);

      if (!res.ok) {
        setIsVerifyingOtp(false);
        return toast.error(data.error || "Failed to verify OTP");
      }

      toast.success("Manager added successfully! ✅");

      // Reset all states
      setForm({
        name: "",
        email: "",
        contact: "",
        password: "",
        confirm: "",
      });
      setShowOtpVerification(false);
      setOtpForNewManager("");
      setPendingManagerData(null);
      setShowAddForm(false);

      load();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to add manager");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const cancelOtpVerification = () => {
    setShowOtpVerification(false);
    setOtpForNewManager("");
    setPendingManagerData(null);
    setShowAddForm(true);
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
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <UserPlus size={18} />
            Add Manager
          </button>
        )}
      </div>

      {/* Add Manager Form - Collapsible */}
      {showAddForm && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 sm:p-6 border border-orange-100 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <UserPlus size={20} className="text-orange-600" />
              Add New Manager
            </h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setForm({
                  name: "",
                  email: "",
                  contact: "",
                  password: "",
                  confirm: "",
                });
              }}
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
            {/* ✅ IMPROVED: Contact input with number-only validation */}
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

          {/* ✅ IMPROVED: Password match indicator */}
          {form.password && form.confirm && (
            <div className={`mt-3 p-2 rounded-lg text-sm ${
              form.password === form.confirm 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {form.password === form.confirm 
                ? "✓ Passwords match" 
                : "✗ Passwords do not match"}
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
            className="mt-4 w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isOtpSending ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Sending OTP...
              </>
            ) : (
              <>
                <Mail size={18} />
                Send Verification OTP
              </>
            )}
          </button>
        </div>
      )}

      {/* OTP Verification Section */}
      {showOtpVerification && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Mail size={20} className="text-blue-600" />
              Email Verification
            </h3>
            <button
              onClick={cancelOtpVerification}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Manager Email:</strong> {pendingManagerData?.email}
              </p>
              <p className="text-xs text-gray-600">
                A 6-digit OTP has been sent to this email address. Please enter it below to complete registration.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Enter OTP *
              </label>
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
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifyingOtp ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Verify & Add Manager
                  </>
                )}
              </button>

              <button
                onClick={sendOtpToManagerEmail}
                disabled={isOtpSending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isOtpSending ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Resending...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Resend OTP
                  </>
                )}
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

        {list.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No managers added yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Add your first manager using the button above
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border rounded-lg bg-white">
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
                      <td className="p-4 text-right">
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
                  className="bg-white border rounded-lg p-4 space-y-3 shadow-sm"
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
                  <div className="pt-2 border-t">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fadeIn">
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
    </div>
  );
}