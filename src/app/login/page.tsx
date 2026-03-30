// ice-inventory\src\app\login\page.tsx



"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast, ToastContainer, Id as ToastId } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getOrCreateDeviceFingerprint } from "@/utils/deviceFingerprint";

interface LoginErrorResponse {
  error?: string;
  code?: "ACCOUNT_LOCKED" | "DEVICE_BANNED" | "DEVICE_BLOCKED";
  unblockAt?: string;
  retryAfterSeconds?: number;
}

function formatUnlockTime(isoString: string): string {
  const ms = new Date(isoString).getTime() - Date.now();
  if (ms <= 0) return "shortly";
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0
      ? `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes > 1 ? "s" : ""}`
      : `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${totalMinutes} minute${totalMinutes > 1 ? "s" : ""}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const inFlightRef = useRef(false);
  const toastIdRef = useRef<ToastId | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const remember = localStorage.getItem("rememberMe");
    if (storedUser && remember === "true") {
      router.push("/dashboard");
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const showErrorToast = (message: string, autoClose: number | false = 4000) => {
    if (toastIdRef.current && toast.isActive(toastIdRef.current)) {
      toast.update(toastIdRef.current, { render: message, type: "error", autoClose });
    } else {
      toastIdRef.current = toast.error(message, { autoClose });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);

    try {
      const clientDeviceId = getOrCreateDeviceFingerprint();
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rememberMe, clientDeviceId }),
      });

      const data: LoginErrorResponse & {
        token?: string;
        user?: { _id: string; managerId?: string | null; email: string; name: string; role: string };
      } = await res.json();

      if (res.ok && data.token && data.user) {
        localStorage.setItem("user", JSON.stringify({
          _id: data.user._id,
          managerId: data.user.managerId ?? null,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        }));
        localStorage.setItem("token", data.token);
        localStorage.setItem("rememberMe", rememberMe ? "true" : "false");
        toast.success("Login successful! Redirecting…");
        setTimeout(() => router.push("/dashboard"), 1800);
        return;
      }

      if (data.code === "ACCOUNT_LOCKED") {
        const wait = data.unblockAt ? ` Try again in ${formatUnlockTime(data.unblockAt)}.` : "";
        showErrorToast(`Account locked.${wait}`, 8000);
        return;
      }
      if (data.code === "DEVICE_BANNED") {
        showErrorToast(data.error ?? "This device has been banned. Please contact support.", 8000);
        return;
      }
      if (data.code === "DEVICE_BLOCKED") {
        showErrorToast(data.error ?? "This device is temporarily blocked.", 8000);
        return;
      }
      if (res.status === 429) {
        const wait = data.retryAfterSeconds ? ` Please wait ${data.retryAfterSeconds}s.` : "";
        showErrorToast(`Too many attempts from this network.${wait}`, 6000);
        return;
      }
      showErrorToast(data.error ?? "Invalid credentials.");
    } catch {
      showErrorToast("Something went wrong. Please check your connection and try again.");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .font-mono { font-family: 'DM Mono', monospace; }
        .input-field {
          width: 100%;
          background: #fff;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15px;
        }
        .input-field::placeholder { color: #9CA3AF; }
        .input-field:focus { border-color: #0066FF; box-shadow: 0 0 0 3px rgba(0,102,255,0.08); }
        .input-field:disabled { opacity: 0.5; background: #F3F4F6; }
        .btn-primary {
          width: 100%;
          background: #0066FF;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-primary:hover:not(:disabled) { background: #0052CC; }
        .btn-primary:active:not(:disabled) { transform: scale(0.99); }
        .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
        .divider { height: 1px; background: #E5E7EB; margin: 20px 0; }
        .feature-pill {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          font-size: 13px;
          color: rgba(255,255,255,0.8);
        }
        .feature-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ADE80; flex-shrink: 0; }
      `}</style>

      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl flex rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-white">

          {/* LEFT — Brand panel */}
          <div className="hidden md:flex md:w-5/12 flex-col justify-between p-10 bg-[#0A0A0A]">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-3 py-1 mb-8">
                <span className="feature-pill-dot"></span>
                <span className="text-white/70 text-xs font-medium">Ice Inventory Platform</span>
              </div>
              <h2 className="text-3xl font-bold text-white leading-tight mb-3">
                The inventory OS for ice cream wholesalers.
              </h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Real-time stock, expiry alerts, delivery tracking — unified in one clean dashboard.
              </p>
            </div>

            <div className="space-y-3">
              {["Real-time stock visibility", "Automatic expiry notifications", "Sales & performance reports"].map((f) => (
                <div key={f} className="feature-pill">
                  <span className="feature-pill-dot"></span>
                  {f}
                </div>
              ))}
            </div>

            <p className="text-white/20 text-xs">
              © {new Date().getFullYear()} Ice Inventory. All rights reserved.
            </p>
          </div>

          {/* RIGHT — Form panel */}
          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-12">
            <div className="max-w-sm mx-auto w-full">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
                <p className="text-sm text-gray-500">Welcome back. Enter your credentials to continue.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* EMAIL */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      disabled={loading}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
                    <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      name="password"
                      type={showPwd ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      disabled={loading}
                      className="input-field"
                      style={{ paddingRight: "40px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* REMEMBER ME */}
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                  />
                  <label htmlFor="rememberMe" className="text-sm text-gray-600 select-none cursor-pointer">
                    Stay signed in for 90 days
                  </label>
                </div>

                {/* SUBMIT */}
                <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: "8px" }}>
                  {loading ? (
                    <><Loader2 className="animate-spin" size={16} />Verifying…</>
                  ) : "Sign in"}
                </button>
              </form>

              <div className="divider" />

              <p className="text-center text-sm text-gray-500">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Create one
                </Link>
              </p>
              <p className="text-center text-sm text-gray-500 mt-2">
                Need to verify?{" "}
                <Link href="/verify-account" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Verify account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-center" autoClose={3000} theme="light" limit={1} />
    </div>
  );
}