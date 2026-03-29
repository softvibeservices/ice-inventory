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

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginErrorResponse {
  error?: string;
  code?: "ACCOUNT_LOCKED" | "DEVICE_BANNED" | "DEVICE_BLOCKED";
  unblockAt?: string;
  retryAfterSeconds?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUnlockTime(isoString: string): string {
  const ms = new Date(isoString).getTime() - Date.now();
  if (ms <= 0) return "shortly";
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes >= 60) {
    const hours   = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0
      ? `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes > 1 ? "s" : ""}`
      : `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${totalMinutes} minute${totalMinutes > 1 ? "s" : ""}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm]             = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [showPwd, setShowPwd]       = useState(false);

  /**
   * Synchronous in-flight guard.
   * React state updates are async — a second click can fire before the
   * first render with loading=true completes. This ref is checked
   * synchronously at the very top of handleSubmit, stopping duplicate calls.
   */
  const inFlightRef = useRef(false);

  /**
   * Stable toast ID.
   * We update a single toast instead of pushing new ones, so hammering
   * the button only ever shows ONE error message at a time.
   */
  const toastIdRef = useRef<ToastId | null>(null);

  // ── Auto-login ────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const remember   = localStorage.getItem("rememberMe");
    if (storedUser && remember === "true") {
      router.push("/dashboard");
    }
  }, [router]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /**
   * Show or update the single persistent error toast.
   * Updating instead of creating prevents the toast stack visible in the bug.
   */
  const showErrorToast = (message: string, autoClose: number | false = 4000) => {
    if (toastIdRef.current && toast.isActive(toastIdRef.current)) {
      toast.update(toastIdRef.current, { render: message, type: "error", autoClose });
    } else {
      toastIdRef.current = toast.error(message, { autoClose });
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Synchronous guard — checked before any async work.
    // This is the primary fix for the multi-toast / count-stuck bug.
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);

    try {
      const clientDeviceId = getOrCreateDeviceFingerprint();

      const res = await fetch("/api/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, rememberMe, clientDeviceId }),
      });

      const data: LoginErrorResponse & {
        token?: string;
        user?: {
          _id: string;
          managerId?: string | null;
          email: string;
          name: string;
          role: string;
        };
      } = await res.json();

      // ── Success ─────────────────────────────────────────────────────────
      if (res.ok && data.token && data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            _id:       data.user._id,
            managerId: data.user.managerId ?? null,
            email:     data.user.email,
            name:      data.user.name,
            role:      data.user.role,
          })
        );
        localStorage.setItem("token",      data.token);
        localStorage.setItem("rememberMe", rememberMe ? "true" : "false");

        toast.success("Login successful! Redirecting…");
        setTimeout(() => router.push("/dashboard"), 1800);
        // Keep loading=true + inFlight=true for the redirect animation.
        // The component unmounts naturally — no reset needed.
        return;
      }

      // ── Account temporarily locked ───────────────────────────────────────
      if (data.code === "ACCOUNT_LOCKED") {
        const wait = data.unblockAt
          ? ` Try again in ${formatUnlockTime(data.unblockAt)}.`
          : "";
        showErrorToast(`Account locked.${wait}`, 8000);
        return;
      }

      // ── Device-level blocks ──────────────────────────────────────────────
      if (data.code === "DEVICE_BANNED") {
        showErrorToast(
          data.error ?? "This device has been banned. Please contact support.",
          8000
        );
        return;
      }

      if (data.code === "DEVICE_BLOCKED") {
        showErrorToast(
          data.error ?? "This device is temporarily blocked.",
          8000
        );
        return;
      }

      // ── IP rate-limit ────────────────────────────────────────────────────
      if (res.status === 429) {
        const wait = data.retryAfterSeconds
          ? ` Please wait ${data.retryAfterSeconds}s.`
          : "";
        showErrorToast(`Too many attempts from this network.${wait}`, 6000);
        return;
      }

      // ── Wrong password / unverified / pending / rejected ─────────────────
      // Server message already includes remaining count, e.g.:
      // "Invalid credentials. 3 attempts remaining before your account is locked."
      showErrorToast(data.error ?? "Invalid credentials.");

    } catch {
      showErrorToast("Something went wrong. Please check your connection and try again.");
    } finally {
      // Re-enable form for next attempt (unless we returned early for redirect).
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#020617] via-[#020b2c] to-[#031136] text-white">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col md:flex-row">

          {/* ── LEFT PANEL ── */}
          <div className="hidden md:flex md:w-1/2 flex-col justify-center px-10 bg-gradient-to-br from-cyan-600/20 to-blue-700/20 border-r border-white/10">
            <h2 className="text-3xl font-extrabold mb-4 text-cyan-400">Welcome Back</h2>
            <p className="text-slate-300 leading-relaxed">
              Manage inventory, billing, delivery partners and analytics —
              all from one powerful dashboard.
            </p>
            <ul className="mt-6 space-y-3 text-slate-300 text-sm">
              <li>✓ Real-time stock updates</li>
              <li>✓ Expiry &amp; delivery alerts</li>
              <li>✓ Sales &amp; performance insights</li>
            </ul>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="flex-1 px-6 sm:px-10 py-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-cyan-400 mb-2">
              Login
            </h2>
            <p className="text-center text-slate-300 mb-8 text-sm sm:text-base">
              Secure access to your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>

              {/* EMAIL */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white placeholder-slate-400 outline-none focus:border-cyan-400 disabled:opacity-50 transition"
                />
              </div>

              {/* PASSWORD */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="password"
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-10 text-white placeholder-slate-400 outline-none focus:border-cyan-400 disabled:opacity-50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition disabled:opacity-50"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* REMEMBER ME */}
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="accent-cyan-500"
                />
                <label htmlFor="rememberMe">
                  Remember Me{" "}
                  <span className="text-slate-400 text-xs">(stay logged in for 90 days)</span>
                </label>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-md py-3 font-semibold transition bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="animate-spin" size={18} />Verifying…</>
                ) : (
                  "Login"
                )}
              </button>
            </form>

            {/* LINKS */}
            <div className="mt-6 text-center text-sm text-slate-300">
              <Link href="/forgot-password" className="text-cyan-400 hover:underline">
                Forgot Password?
              </Link>
              <span className="mx-2 text-slate-500">·</span>
              <Link href="/verify-account" className="text-cyan-400 hover:underline">
                Verify Account
              </Link>
              <span className="mx-2 text-slate-500">·</span>
              <Link href="/register" className="text-cyan-400 hover:underline">
                Create Account
              </Link>
            </div>
          </div>

        </div>
      </main>

      <Footer />

      {/*
        limit={1} is the second layer of defense: even if two requests somehow
        both reach the toast call, the second replaces the first instead of
        stacking a new one below it.
      */}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        theme="dark"
        limit={1}
      />
    </div>
  );
}