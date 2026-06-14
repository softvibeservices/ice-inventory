"use client";
// src/app/dashboard/profile/page.tsx

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import { User, Lock, LogOut, Menu, X, Shield, Hash, CreditCard } from "lucide-react";
import DeliveryPartnersTable from "@/app/dashboard/profile/delivery-partners/page";
import ManagerComponent from "@/app/dashboard/profile/ManagerComponent";
import BasicInformationComponent from "./BasicInformationComponent";
import BillingDetailsComponent from "./BillingDetailsComponent";
import BankDetailsComponent from "./BankDetailsComponent";
import ProductSettingsComponent from "./ProductSettingsComponent";
import SerialNumberComponent from "./SerialNumberComponent";
import ActiveSessionsComponent from "./ActiveSessionsComponent";
import Link from "next/link";
import type {
  ActiveTab,
  UserProfile,
  PasswordForm,
} from "@/types/profile.types";

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [originalUser, setOriginalUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as ActiveTab) || "basic";
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);

  // Sync activeTab when URL search query parameter changes
  useEffect(() => {
    const tab = searchParams.get("tab") as ActiveTab;
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    oldPassword: "",
    newPassword: "",
    otp: "",
  });
  const [otpSent, setOtpSent] = useState<boolean>(false);
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
      localStorage.removeItem("token");
      localStorage.removeItem("rememberMe");
      router.push("/login");
      return;
    }
    if (!parsed?._id) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
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
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.error) {
          toast.error(data?.error || "Failed to load profile ❌");
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("rememberMe");
          router.push("/login");
          return;
        }
        setUser(data);
        setOriginalUser(data);
      } catch {
        toast.error("Failed to load profile ❌");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("rememberMe");
        router.push("/login");
      }
    };
    loadProfile();
  }, [router]);

  // Fetch sellerId for bank tab
  useEffect(() => {
    if (!user?._id) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/seller-details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();

        let rawId = data?._id;
        if (!rawId) return;

        if (typeof rawId === "object" && rawId !== null) {
          rawId = rawId.$oid ?? rawId.toString?.() ?? String(rawId);
        } else {
          rawId = String(rawId);
        }

        if (rawId && rawId !== "[object Object]") {
          setSellerId(rawId);
        }
      } catch {
        // seller details not yet set up
      }
    })();
  }, [user?._id]);

  // Change password
  const handlePasswordChange = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      toast.error("Please fill all password fields");
      return;
    }
    if (!otpSent) {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/profile/change-password/request-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ oldPassword: passwordForm.oldPassword }),
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
      } catch {
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
      const token = localStorage.getItem("token");
      const res = await fetch("/api/profile/change-password/verify", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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
    } catch {
      setLoading(false);
      toast.error("Something went wrong ❌");
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("rememberMe");
    toast.success("Logged out 👋");
    router.push("/login");
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState(null, "", url.pathname + url.search);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100 dash-content-offset">
        <DashboardNavbar />
        <main className="flex-grow flex items-center justify-center px-4">
          <p className="text-gray-600 text-base sm:text-lg">
            Loading profile...
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  //  Sidebar nav items
  // ─────────────────────────────────────────────
  const navItems: {
    tab: ActiveTab;
    label: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      tab: "basic",
      label: "Basic Information",
      icon: <User size={18} />,
      color: "bg-blue-600",
    },
    {
      tab: "billing",
      label: "Bill Details",
      icon: "📄",
      color: "bg-purple-600",
    },
    {
      tab: "bank",
      label: "Bank Details",
      icon: "🏦",
      color: "bg-indigo-600",
    },
    {
      tab: "product-settings",
      label: "Product Settings",
      icon: "⚙️",
      color: "bg-teal-600",
    },
    {
      tab: "delivery",
      label: "Delivery Partners",
      icon: "🚚",
      color: "bg-yellow-600",
    },
    {
      tab: "managers",
      label: "Managers",
      icon: "👤",
      color: "bg-orange-600",
    },
    {
      tab: "sessions",
      label: "Active Sessions",
      icon: <Shield size={18} />,
      color: "bg-blue-700",
    },
    {
      tab: "password",
      label: "Change Password",
      icon: <Lock size={18} />,
      color: "bg-green-600",
    },
    {
      tab: "serial",
      label: "Serial Bill Number",
      icon: <Hash size={18} />,
      color: "bg-gray-600",
    },
    // ── PHASE 6 ADDITION: Subscription tab ──────────────────────────────────
    {
      tab: "subscription",
      label: "Subscription",
      icon: <CreditCard size={18} />,
      color: "bg-cyan-600",
    },
    // ────────────────────────────────────────────────────────────────────────
    {
      tab: "logout",
      label: "Logout",
      icon: <LogOut size={18} />,
      color: "bg-red-600",
    },
  ];

  const SidebarButton = ({
    tab,
    label,
    icon,
    color,
    onClick,
  }: {
    tab: ActiveTab;
    label: string;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium transition-colors ${
        activeTab === tab ? `${color} text-white` : "hover:bg-gray-100 text-gray-700"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dash-content-offset">
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

      <main className="flex-grow container mx-auto px-4 py-4 sm:py-6 lg:py-8 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white rounded-xl shadow-md h-[calc(100vh-12rem)] sticky top-4 overflow-y-auto">
          <div className="p-4 space-y-2">
            {navItems.map((item) => (
              <SidebarButton
                key={item.tab}
                tab={item.tab}
                label={item.label}
                icon={item.icon}
                color={item.color}
                onClick={() => handleTabChange(item.tab)}
              />
            ))}
          </div>
        </aside>

        {/* Mobile Sidebar (Overlay) */}
        {isMobileSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
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
              {navItems.map((item) => (
                <SidebarButton
                  key={item.tab}
                  tab={item.tab}
                  label={item.label}
                  icon={item.icon}
                  color={item.color}
                  onClick={() => handleTabChange(item.tab)}
                />
              ))}
            </aside>
          </div>
        )}

        {/* Content Panel */}
        <section className="flex-1 bg-white rounded-xl shadow-md h-[calc(100vh-12rem)] overflow-y-auto">
          <div className="p-4 sm:p-6">

            {activeTab === "basic" && user && (
              <BasicInformationComponent
                user={user}
                onUpdate={(updatedUser) => {
                  setUser(updatedUser);
                  setOriginalUser(updatedUser);
                }}
              />
            )}

            {activeTab === "billing" && user && (
              <BillingDetailsComponent userId={user._id} />
            )}

            {activeTab === "bank" && (
              sellerId === null ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <p className="text-gray-500 text-sm">
                    Loading bank details...
                  </p>
                  <p className="text-gray-400 text-xs max-w-sm">
                    Bank details are linked to your seller profile. If this
                    keeps loading, please go to{" "}
                    <strong>Bill Details</strong> tab and save your seller
                    information first.
                  </p>
                </div>
              ) : (
                <BankDetailsComponent sellerId={sellerId} />
              )
            )}

            {activeTab === "product-settings" && (
              <ProductSettingsComponent userId={user._id} />
            )}

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

            {activeTab === "managers" && (
              <ManagerComponent adminId={user._id} />
            )}

            {activeTab === "sessions" && (
              <ActiveSessionsComponent />
            )}

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
                <button
                  onClick={handlePasswordChange}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {otpSent ? "Changing Password..." : "Sending OTP..."}
                    </>
                  ) : otpSent ? (
                    "Change Password"
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </div>
            )}

            {activeTab === "serial" && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-gray-800">
                  <Hash className="w-5 h-5" /> Serial Bill Number
                </h2>
                <SerialNumberComponent userId={user._id} />
              </div>
            )}

            {/* ── PHASE 6 ADDITION: Subscription tab ────────────────────────── */}
            {activeTab === "subscription" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-gray-800">
                    <CreditCard className="w-5 h-5 text-cyan-600" /> Subscription
                  </h2>
                </div>

                <p className="text-sm text-gray-600">
                  View your current plan, usage, and manage your subscription.
                </p>

                {/* Summary card + link to full page */}
                <div className="border border-cyan-200 bg-cyan-50 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-cyan-900 mb-0.5">
                      Full subscription management is available on a dedicated page.
                    </p>
                    <p className="text-xs text-cyan-700">
                      View plan details, usage, active add-ons, payment history,
                      and upgrade options.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/subscription"
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <CreditCard size={15} />
                    Manage Plan
                  </Link>
                </div>
              </div>
            )}
            {/* ────────────────────────────────────────────────────────────────── */}

            {activeTab === "logout" && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-gray-800">
                  <LogOut className="w-5 h-5" /> Logout
                </h2>
                <p className="text-gray-600">
                  You are currently logged in as{" "}
                  <strong>{user.name}</strong> ({user.email}).
                </p>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <LogOut size={18} />
                  Confirm Logout
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}