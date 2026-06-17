"use client";
// src/app/dashboard/profile/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import {
  User,
  Lock,
  LogOut,
  Shield,
  Hash,
  CreditCard,
  FileText,
  Landmark,
  Settings,
  Truck,
  Users,
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("basic");

  // Read ?tab= from the URL on mount and on browser back/forward navigation.
  // Using window.location.search (client-only) avoids the Next.js
  // useSearchParams() Suspense requirement during static prerendering.
  useEffect(() => {
    const readTab = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as ActiveTab | null;
      if (tab) setActiveTab(tab);
    };
    readTab();
    window.addEventListener("popstate", readTab);
    return () => window.removeEventListener("popstate", readTab);
  }, []);

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    oldPassword: "",
    newPassword: "",
    otp: "",
  });
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [sellerId, setSellerId] = useState<string | null>(null);

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
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState(null, "", url.pathname + url.search);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dash-content-offset">
        <DashboardNavbar />
        <main className="flex-grow flex items-center justify-center px-4">
          <p className="text-slate-500 text-base">Loading profile...</p>
        </main>
        <Footer />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  //  Tab nav items (all 11 preserved)
  // ─────────────────────────────────────────────
  const navItems: {
    tab: ActiveTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      tab: "basic",
      label: "Basic Info",
      icon: <User size={14} />,
    },
    {
      tab: "billing",
      label: "Bill Details",
      icon: <FileText size={14} />,
    },
    {
      tab: "bank",
      label: "Bank Details",
      icon: <Landmark size={14} />,
    },
    {
      tab: "product-settings",
      label: "Product Settings",
      icon: <Settings size={14} />,
    },
    {
      tab: "delivery",
      label: "Delivery Partners",
      icon: <Truck size={14} />,
    },
    {
      tab: "managers",
      label: "Managers",
      icon: <Users size={14} />,
    },
    {
      tab: "sessions",
      label: "Active Sessions",
      icon: <Shield size={14} />,
    },
    {
      tab: "password",
      label: "Change Password",
      icon: <Lock size={14} />,
    },
    {
      tab: "serial",
      label: "Serial Number",
      icon: <Hash size={14} />,
    },
    // ── PHASE 6 ADDITION: Subscription tab ──────────────────────────────────
    {
      tab: "subscription",
      label: "Subscription",
      icon: <CreditCard size={14} />,
    },
    // ────────────────────────────────────────────────────────────────────────
    {
      tab: "logout",
      label: "Logout",
      icon: <LogOut size={14} />,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dash-content-offset">
      <DashboardNavbar />

      <main className="flex-grow">
        <div className="page-wrapper">

          {/* Page Header */}
          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">Profile</h1>
              <p className="page-subtitle">
                Manage your account settings, billing details, and preferences
              </p>
            </div>
          </div>

          {/* ── Horizontal Tab Strip (replaces inner sidebar) ── */}
          <div className="saas-card saas-card-compact mb-6">
            <div className="flex flex-wrap gap-1.5 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.tab}
                  onClick={() => handleTabChange(item.tab)}
                  className={`btn btn-sm ${
                    activeTab === item.tab ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab Content Panel ── */}
          <div className="saas-card">
            <div className="p-2">

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
                    <p className="text-slate-500 text-sm">
                      Loading bank details...
                    </p>
                    <p className="text-slate-400 text-xs max-w-sm">
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
                    <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <Truck size={16} className="text-slate-500" />
                      Delivery Partners
                    </h2>
                    <div className="text-xs text-slate-500">
                      Manage delivery partners linked to your account
                    </div>
                  </div>
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
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
                  <h2 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <Lock className="w-4 h-4 text-slate-500" /> Change Password
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-sm text-slate-600">
                      Old Password
                      <input
                        className="mt-1 w-full border border-slate-200 rounded-lg p-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
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
                    <label className="text-sm text-slate-600">
                      New Password
                      <input
                        className="mt-1 w-full border border-slate-200 rounded-lg p-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
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
                      <label className="text-sm text-slate-600 md:col-span-2">
                        OTP (sent to your registered email)
                        <input
                          className="mt-1 w-full border border-slate-200 rounded-lg p-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
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
                    className="btn btn-success"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                  <h2 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <Hash className="w-4 h-4 text-slate-500" /> Serial Bill Number
                  </h2>
                  <SerialNumberComponent userId={user._id} />
                </div>
              )}

              {/* ── PHASE 6 ADDITION: Subscription tab ────────────────────────── */}
              {activeTab === "subscription" && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                      <CreditCard className="w-4 h-4 text-cyan-600" /> Subscription
                    </h2>
                  </div>

                  <p className="text-sm text-slate-600">
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
                  <h2 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <LogOut className="w-4 h-4 text-slate-500" /> Logout
                  </h2>
                  <p className="text-slate-600 text-sm">
                    You are currently logged in as{" "}
                    <strong>{user.name}</strong> ({user.email}).
                  </p>
                  <button
                    onClick={logout}
                    className="btn btn-danger"
                  >
                    <LogOut size={16} />
                    Confirm Logout
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}