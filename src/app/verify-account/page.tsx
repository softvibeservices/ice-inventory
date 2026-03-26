// src/app/verify-account/page.tsx
//
// Flow:
//   Step 1 — "email": user enters their registered email
//             → POST /api/verify-account  (checks exist + unverified + cooldown, sends OTP)
//   Step 2 — "otp": user enters the 6-digit OTP
//             → POST /api/verify           (same route used by the original verify-otp page)
//             → on success → redirect to /login
//   Resend  → POST /api/register/resend    (same route used by the original verify-otp page, handles cooldown)

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Key, Loader2, CheckCircle, ShieldCheck } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const COOLDOWN_SECONDS = 60;

export default function VerifyAccountPage() {
  const router = useRouter();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState<"email" | "otp">("email");
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [loading, setLoading] = useState(false);

  // Cooldown timer for resend button
  const [cooldown,    setCooldown]    = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const startCooldown = (initialSeconds = COOLDOWN_SECONDS) => {
    setCooldown(initialSeconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ─── Step 1: Request OTP ───────────────────────────────────────────────────
  const handleRequestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your registered email.");
      return;
    }

    try {
      setLoading(true);

      const res  = await fetch("/api/verify-account", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Verification OTP sent to your email!");
        setStep("otp");
        startCooldown();
      } else if (res.status === 404) {
        // Account not found
        toast.error(data.error || "No account found. Please register first.", {
          autoClose: 4000,
        });
        setTimeout(() => router.push("/register"), 4000);
      } else if (res.status === 400) {
        // Already verified
        toast.success(
          data.error ||
            "Account already verified! Redirecting to login…"
        );
        setTimeout(() => router.push("/login"), 2500);
      } else if (res.status === 429 && data.waitSeconds) {
        toast.error(`Please wait ${data.waitSeconds}s before requesting another OTP.`);
        startCooldown(data.waitSeconds);
      } else {
        toast.error(data.error || "Failed to send OTP. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!otp.trim()) {
      toast.error("Please enter the OTP.");
      return;
    }

    try {
      setLoading(true);

      const res  = await fetch("/api/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Account verified successfully! Redirecting to login…");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        toast.error(data.error || "Invalid OTP. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown}s before requesting another OTP.`);
      return;
    }

    try {
      setLoading(true);

      const res  = await fetch("/api/register/resend", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("OTP resent to your email.");
        startCooldown();
      } else if (res.status === 429 && data.waitSeconds) {
        toast.error(`Please wait ${data.waitSeconds}s before resending.`);
        startCooldown(data.waitSeconds);
      } else {
        toast.error(data.error || "Unable to resend OTP. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#020617] via-[#020b2c] to-[#031136] text-white">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 sm:p-8">

          {/* ── Header ── */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-4">
              <ShieldCheck className="text-cyan-400" size={28} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 text-center">
              Verify Account
            </h2>
            <p className="mt-2 text-center text-sm sm:text-base text-slate-300">
              {step === "email"
                ? "Enter your registered email to receive a verification OTP"
                : `Enter the 6-digit OTP sent to ${email}`}
            </p>
          </div>

          {/* ── Step indicator ── */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {/* Step 1 dot */}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === "email"
                    ? "bg-cyan-500 text-black"
                    : "bg-green-500 text-white"
                }`}
              >
                {step === "email" ? "1" : <CheckCircle size={14} />}
              </div>
              <span className="text-xs text-slate-400">Email</span>
            </div>

            {/* Divider */}
            <div
              className={`h-px w-10 transition-colors ${
                step === "otp" ? "bg-cyan-500" : "bg-white/10"
              }`}
            />

            {/* Step 2 dot */}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === "otp"
                    ? "bg-cyan-500 text-black"
                    : "bg-white/10 text-slate-400"
                }`}
              >
                2
              </div>
              <span className="text-xs text-slate-400">OTP</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              STEP 1 — EMAIL FORM
          ══════════════════════════════════════════ */}
          {step === "email" && (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              {/* Email input */}
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your registered email"
                  required
                  autoFocus
                  className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3
                             text-white placeholder-slate-400 outline-none
                             focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition"
                />
              </div>

              {/* Cooldown hint on initial send  */}
              {cooldown > 0 && (
                <p className="text-center text-xs text-slate-400">
                  You can request a new OTP in{" "}
                  <span className="font-semibold text-cyan-400">{cooldown}s</span>
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className={`w-full flex items-center justify-center gap-2 rounded-md py-3 font-semibold transition
                  ${
                    loading || cooldown > 0
                      ? "bg-cyan-600/50 cursor-not-allowed text-white/60"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white"
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Sending OTP…
                  </>
                ) : cooldown > 0 ? (
                  `Wait ${cooldown}s`
                ) : (
                  "Send Verification OTP"
                )}
              </button>

              {/* Quick links */}
              <div className="flex flex-col gap-1.5 pt-1 text-center text-xs text-slate-400">
                <span>
                  Don&apos;t have an account?{" "}
                  <a href="/register" className="text-cyan-400 hover:underline font-medium">
                    Register
                  </a>
                </span>
                <span>
                  Already verified?{" "}
                  <a href="/login" className="text-cyan-400 hover:underline font-medium">
                    Login
                  </a>
                </span>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════
              STEP 2 — OTP FORM
          ══════════════════════════════════════════ */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* Email badge — shows which email the OTP was sent to */}
              <div className="flex items-center gap-2 rounded-md bg-white/5 border border-white/10 px-3 py-2.5">
                <Mail className="text-cyan-400 shrink-0" size={16} />
                <span className="text-sm text-white break-all truncate">{email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                  }}
                  className="ml-auto text-xs text-slate-400 hover:text-cyan-400 transition shrink-0"
                >
                  Change
                </button>
              </div>

              {/* OTP input */}
              <div className="relative">
                <Key
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  required
                  autoFocus
                  className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3
                             text-center tracking-[0.5em] text-lg font-semibold
                             text-white placeholder-slate-400 outline-none
                             focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition"
                />
              </div>

              {/* Cooldown hint */}
              {cooldown > 0 && (
                <p className="text-center text-xs text-slate-400">
                  You can resend OTP in{" "}
                  <span className="font-semibold text-cyan-400">{cooldown}s</span>
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {/* Verify */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md py-3 font-semibold
                             bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition
                             disabled:opacity-60 disabled:cursor-not-allowed text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Verifying…
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </button>

                {/* Resend */}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                  className="flex-1 rounded-md py-3 border border-white/20 text-slate-300
                             hover:bg-white/5 transition
                             disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend OTP"}
                </button>
              </div>

              {/* Hint */}
              <p className="text-center text-xs text-slate-500">
                The OTP is valid for 10 minutes. Check your spam folder if you
                don&apos;t see it in your inbox.
              </p>
            </form>
          )}
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="dark" autoClose={3000} />
    </div>
  );
}