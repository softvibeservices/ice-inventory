// src/app/dashboard/profile/page.tsx

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import { User, Lock, LogOut, Menu, X } from "lucide-react";
import DeliveryPartnersTable from "@/app/dashboard/profile/delivery-partners/page";
import ManagerComponent from "@/app/dashboard/profile/ManagerComponent";
import BasicInformationComponent from "./BasicInformationComponent";
import BillingDetailsComponent from "./BillingDetailsComponent";
import BankDetailsComponent from "./BankDetailsComponent";
import type {
  ActiveTab,
  UserProfile,
  PasswordForm,
} from "@/types/profile.types";

export default function ProfilePage() {
  const router = useRouter();

  // State Declarations
  const [user, setUser] = useState<UserProfile | null>(null);
  const [originalUser, setOriginalUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("basic");
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    oldPassword: "",
    newPassword: "",
    otp: "",
  });
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [showResetSerialConfirm, setShowResetSerialConfirm] =
    useState<boolean>(false);
  const [resetConfirmText, setResetConfirmText] = useState<string>("");
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Fetch logged user profile
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(stored);
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("rememberMe");
      router.push("/login");
      return;
    }
    if (!parsed?._id) {
      localStorage.removeItem("user");
      localStorage.removeItem("rememberMe");
      router.push("/login");
      return;
    }
    if (parsed?.role === "manager") {
      router.push("/dashboard");
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await fetch(
          `/api/profile?userId=${encodeURIComponent(parsed._id)}`
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.error) {
          toast.error(data?.error || "Failed to load profile ❌");
          localStorage.removeItem("user");
          localStorage.removeItem("rememberMe");
          router.push("/login");
          return;
        }
        setUser(data);
        setOriginalUser(data);
      } catch {
        toast.error("Failed to load profile ❌");
        localStorage.removeItem("user");
        localStorage.removeItem("rememberMe");
        router.push("/login");
      }
    };
    loadProfile();
  }, [router]);

  // Fetch seller ID for bank details
  useEffect(() => {
    if (!user?._id) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/seller-details?userId=${encodeURIComponent(user._id)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data && data._id) {
          setSellerId(data._id);
        }
      } catch {
        // ignore
      }
    })();
  }, [user?._id]);

  // Change password with OTP
  const changePassword = async () => {
    if (!user) {
      toast.error("User not loaded");
      return;
    }
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      toast.error("Please fill old and new password");
      return;
    }
    if (!otpSent) {
      setLoading(true);
      try {
        const res = await fetch("/api/profile/change-password/request-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id,
            oldPassword: passwordForm.oldPassword,
          }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
          toast.error(data.error || "Failed to send OTP ❌");
          return;
        }
        setOtpSent(true);
        toast.success(
          "OTP sent to your registered email. Please check your inbox 📧"
        );
      } catch (error) {
        setLoading(false);
        toast.error("Something went wrong while sending OTP ❌");
      }
      return;
    }
    if (!passwordForm.otp) {
      toast.error("Please enter the OTP sent to your email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profile/change-password/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          newPassword: passwordForm.newPassword,
          otp: passwordForm.otp,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        toast.error(data.error || "Failed to change password ❌");
        return;
      }
      toast.success("Password changed successfully 🔑");
      setPasswordForm({ oldPassword: "", newPassword: "", otp: "" });
      setOtpSent(false);
    } catch (error) {
      setLoading(false);
      toast.error("Something went wrong ❌");
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
    toast.success("Logged out 👋");
    router.push("/login");
  };

  // Handle tab change and close mobile sidebar
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  };

  // UI
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <DashboardNavbar />
        <main className="flex-grow flex items-center justify-center px-4">
          <p className="text-gray-600 text-base sm:text-lg">Loading profile...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <DashboardNavbar />
      
      {/* Mobile Menu Button */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="flex items-center gap-2 text-gray-700 font-medium"
        >
          {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          <span>Menu</span>
        </button>
      </div>

      <main className="flex-grow container mx-auto px-4 py-4 sm:py-6 lg:py-8 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 bg-white rounded-xl shadow-md p-4 space-y-2 h-fit sticky top-4">
          <button
            onClick={() => setActiveTab("basic")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
              activeTab === "basic"
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <User size={18} /> Basic Information
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
              activeTab === "billing"
                ? "bg-purple-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            📄 Bill Details
          </button>
          <button
            onClick={() => setActiveTab("bank")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
              activeTab === "bank"
                ? "bg-indigo-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            🏦 Bank Details
          </button>
          <button
            onClick={() => setActiveTab("delivery")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
              activeTab === "delivery"
                ? "bg-yellow-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            🚚 Delivery Partners
          </button>
          <button
            onClick={() => setActiveTab("managers")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
              activeTab === "managers"
                ? "bg-orange-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            👤 Managers
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
              activeTab === "password"
                ? "bg-green-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <Lock size={18} /> Change Password
          </button>
          <button
            onClick={() => {
              setResetConfirmText("");
              setShowResetSerialConfirm(true);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium hover:bg-gray-100 text-gray-700 transition-colors"
          >
            🔁 Reset Bill Serial Number
          </button>
          <button
            onClick={() => setActiveTab("logout")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
              activeTab === "logout"
                ? "bg-red-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <LogOut size={18} /> Logout
          </button>
        </aside>

        {/* Sidebar - Mobile (Dropdown) */}
        {isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileSidebarOpen(false)}>
            <aside 
              className="absolute top-0 left-0 w-64 h-full bg-white shadow-lg p-4 space-y-2 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h3 className="font-semibold text-gray-800">Profile Menu</h3>
                <button onClick={() => setIsMobileSidebarOpen(false)}>
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              
              <button
                onClick={() => handleTabChange("basic")}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
                  activeTab === "basic"
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <User size={18} /> Basic Information
              </button>
              <button
                onClick={() => handleTabChange("billing")}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
                  activeTab === "billing"
                    ? "bg-purple-600 text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                📄 Bill Details
              </button>
              <button
                onClick={() => handleTabChange("bank")}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
                  activeTab === "bank"
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🏦 Bank Details
              </button>
              <button
                onClick={() => handleTabChange("delivery")}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
                  activeTab === "delivery"
                    ? "bg-yellow-600 text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                🚚 Delivery Partners
              </button>
              <button
                onClick={() => handleTabChange("managers")}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
                  activeTab === "managers"
                    ? "bg-orange-600 text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                👤 Managers
              </button>
              <button
                onClick={() => handleTabChange("password")}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
                  activeTab === "password"
                    ? "bg-green-600 text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <Lock size={18} /> Change Password
              </button>
              <button
                onClick={() => {
                  setResetConfirmText("");
                  setShowResetSerialConfirm(true);
                  setIsMobileSidebarOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium hover:bg-gray-100 text-gray-700 transition-colors"
              >
                🔁 Reset Bill Serial Number
              </button>
              <button
                onClick={() => handleTabChange("logout")}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
                  activeTab === "logout"
                    ? "bg-red-600 text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <LogOut size={18} /> Logout
              </button>
            </aside>
          </div>
        )}

        {/* Content */}
        <section className="flex-1 bg-white rounded-xl shadow-md p-4 sm:p-6">
          {/* BASIC */}
          {activeTab === "basic" && user && (
            <BasicInformationComponent
              user={user}
              onUpdate={(updatedUser) => {
                setUser(updatedUser);
                setOriginalUser(updatedUser);
              }}
            />
          )}

          {/* BILLING */}
          {activeTab === "billing" && user && (
            <BillingDetailsComponent userId={user._id} />
          )}

          {/* BANK */}
          {activeTab === "bank" && (
            <BankDetailsComponent sellerId={sellerId} />
          )}

          {/* DELIVERY PARTNERS */}
          {activeTab === "delivery" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                  🚚 Delivery Partners
                </h2>
                <div className="text-xs sm:text-sm text-gray-500">
                  Manage delivery partners linked to your account
                </div>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <DeliveryPartnersTable />
                </div>
              </div>
            </div>
          )}

          {/* MANAGERS */}
          {activeTab === "managers" && (
            <ManagerComponent adminId={user._id} />
          )}

          {/* PASSWORD */}
          {activeTab === "password" && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-gray-800">
                <Lock className="w-5 h-5" /> Change Password
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm text-gray-600">
                  Old Password
                  <input
                    className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) =>
                      setPasswordForm((p) => ({
                        ...p,
                        oldPassword: e.target.value,
                      }))
                    }
                    placeholder="Old Password"
                  />
                </label>
                <label className="text-sm text-gray-600">
                  New Password
                  <input
                    className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((p) => ({
                        ...p,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="New Password"
                  />
                </label>
                {otpSent && (
                  <label className="text-sm text-gray-600 md:col-span-2">
                    OTP (sent to your registered email)
                    <input
                      className="mt-1 w-full border rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      type="text"
                      value={passwordForm.otp}
                      onChange={(e) =>
                        setPasswordForm((p) => ({
                          ...p,
                          otp: e.target.value,
                        }))
                      }
                      placeholder="Enter 6-digit OTP"
                    />
                  </label>
                )}
              </div>
              <div className="space-y-2">
                <button
                  onClick={changePassword}
                  disabled={loading}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow disabled:opacity-50 transition-colors font-medium"
                >
                  {loading
                    ? otpSent
                      ? "Verifying OTP..."
                      : "Sending OTP..."
                    : otpSent
                    ? "✅ Verify OTP & Change Password"
                    : "🔑 Send OTP to Change Password"}
                </button>
                <p className="text-xs text-gray-500">
                  First click will send an OTP to your registered email. After
                  entering OTP, click again to change your password.
                </p>
              </div>
            </div>
          )}

          {/* LOGOUT */}
          {activeTab === "logout" && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 sm:py-12">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 text-center">
                Ready to leave?
              </h2>
              <button
                onClick={logout}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg shadow transition-colors font-medium"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Reset Serial Confirmation Dialog */}
      {showResetSerialConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              Reset Bill Serial Number
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 mb-3">
              This will <strong>completely reset</strong> the bill serial
              number. The next bill will start from <strong>1</strong>.
              <br />
              <br />
              To confirm, type <strong>CONFIRM</strong> below and press Enter.
            </p>
            <input
              autoFocus
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && resetConfirmText === "CONFIRM") {
                  localStorage.setItem("reset-billing-serial", "1");
                  toast.success("Serial number reset confirmed ✅");
                  setShowResetSerialConfirm(false);
                  router.push("/dashboard/billing");
                }
              }}
              placeholder="Type CONFIRM"
              className="w-full border rounded-lg p-2 sm:p-3 text-gray-900 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowResetSerialConfirm(false)}
                className="w-full sm:w-auto px-4 py-2 rounded border text-gray-700 hover:bg-gray-50 transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                disabled={resetConfirmText !== "CONFIRM"}
                onClick={() => {
                  localStorage.setItem("reset-billing-serial", "1");
                  toast.success("Serial number reset confirmed ✅");
                  setShowResetSerialConfirm(false);
                  router.push("/dashboard/billing");
                }}
                className="w-full sm:w-auto px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50 hover:bg-red-700 transition-colors order-1 sm:order-2"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
