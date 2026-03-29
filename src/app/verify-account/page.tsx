// src/app/verify-account/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Key, Loader2, CheckCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ─── Constants (must match server) ───────────────────────────────────────────

const COOLDOWN_SECONDS = 60;
const MAX_RESENDS      = 3;

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifyAccountPage() {
  const router = useRouter();

  // ── Shared state ────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState<"email" | "otp">("email");
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [loading, setLoading] = useState(false);

  // ── Resend state ────────────────────────────────────────────────────────────
  const [cooldown,        setCooldown]        = useState(0);
  const [resendsLeft,     setResendsLeft]     = useState(MAX_RESENDS);
  const [resendExhausted, setResendExhausted] = useState(false);

  // Debounce refs
  const loadingRef    = useRef(false);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // ── Cooldown timer ──────────────────────────────────────────────────────────
  const startCooldown = useCallback((seconds = COOLDOWN_SECONDS) => {
    setCooldown(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Step 1: Request OTP ─────────────────────────────────────────────────────
  const handleRequestOtp = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loadingRef.current || loading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your registered email.");
      return;
    }
    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown}s before requesting another OTP.`);
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    try {
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
        toast.error(data.error || "No account found. Please register first.", { autoClose: 4000 });
        setTimeout(() => router.push("/register"), 4000);
      } else if (res.status === 400 && data.error?.toLowerCase().includes("already verified")) {
        toast.success("Account already verified! Redirecting to login…");
        setTimeout(() => router.push("/login"), 2500);
      } else if (res.status === 429) {
        const wait = data?.waitSeconds ?? data?.retryAfterSeconds ?? COOLDOWN_SECONDS;
        toast.error(`Please wait ${wait}s before requesting another OTP.`);
        startCooldown(wait);
      } else {
        toast.error(data.error || "Failed to send OTP. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [email, loading, cooldown, router, startCooldown]);

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loadingRef.current || loading) return;

    if (!otp || otp.length !== 6) {
      toast.error("Please enter the full 6-digit OTP.");
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    try {
      const res  = await fetch("/api/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), otp }),
      });
      const data = await res.json();

      if (res.status === 429) {
        toast.error(`Too many attempts. Please wait before trying again.`);
        return;
      }

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
      loadingRef.current = false;
    }
  }, [email, otp, loading, router]);

  // ── Resend OTP ──────────────────────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (loadingRef.current || loading || cooldown > 0 || resendExhausted) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const res  = await fetch("/api/register/resend", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.status === 429) {
        const wait = data?.waitSeconds ?? data?.retryAfterSeconds ?? COOLDOWN_SECONDS;
        if (data?.retryAfterSeconds) {
          setResendExhausted(true);
          toast.error("Resend limit reached. Please try again later.");
        } else {
          toast.error(`Please wait ${wait}s before resending.`);
          startCooldown(wait);
        }
        return;
      }

      if (!res.ok) {
        toast.error(data?.error || "Unable to resend OTP. Please try again.");
        return;
      }

      toast.success("A new OTP has been sent to your email.");
      setResendsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) setResendExhausted(true);
        return Math.max(0, next);
      });
      startCooldown();
      setOtp("");
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [email, loading, cooldown, resendExhausted, startCooldown]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const resendDisabled = loading || cooldown > 0 || resendExhausted;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#020617] via-[#020b2c] to-[#031136] text-white">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 sm:p-8">

          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3">
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

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === "email" ? "bg-cyan-500 text-black" : "bg-green-500 text-white"}`}>
                {step === "email" ? "1" : <CheckCircle size={14} />}
              </div>
              <span className="text-xs text-slate-400">Email</span>
            </div>
            <div className={`h-px w-10 transition-colors ${step === "otp" ? "bg-cyan-500" : "bg-white/10"}`} />
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === "otp" ? "bg-cyan-500 text-black" : "bg-white/10 text-slate-400"}`}>
                2
              </div>
              <span className="text-xs text-slate-400">OTP</span>
            </div>
          </div>

          {/* ── STEP 1: EMAIL ── */}
          {step === "email" && (
            <form onSubmit={handleRequestOtp} className="space-y-5" noValidate>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your registered email"
                  required
                  autoFocus
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white placeholder-slate-400 outline-none focus:border-cyan-400 disabled:opacity-50 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full flex items-center justify-center gap-2 rounded-md py-3 font-semibold transition bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="animate-spin" size={18} />Sending OTP…</>
                ) : cooldown > 0 ? (
                  `Wait ${cooldown}s`
                ) : (
                  "Send Verification OTP"
                )}
              </button>

              <div className="flex flex-col gap-1.5 text-center text-xs text-slate-400">
                <span>Don't have an account?{" "}
                  <a href="/register" className="text-cyan-400 hover:underline font-medium">Register</a>
                </span>
                <span>Already verified?{" "}
                  <a href="/login" className="text-cyan-400 hover:underline font-medium">Login</a>
                </span>
              </div>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>

              {/* Email badge */}
              <div className="flex items-center gap-2 rounded-md bg-white/5 border border-white/10 px-3 py-2.5">
                <Mail className="text-cyan-400 shrink-0" size={16} />
                <span className="text-sm text-white break-all">{email}</span>
                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(""); }}
                  className="ml-auto text-xs text-slate-400 hover:text-cyan-400 transition shrink-0"
                >
                  Change
                </button>
              </div>

              {/* OTP input */}
              <div>
                <label className="block text-sm text-slate-300 mb-1 text-center">
                  Enter 6-digit OTP
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                    placeholder="••••••"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={loading}
                    className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-center tracking-[0.5em] text-xl font-bold text-white placeholder-slate-600 outline-none focus:border-cyan-400 disabled:opacity-50 transition"
                  />
                </div>
                <p className="text-center text-xs text-slate-500 mt-1">{otp.length} / 6 digits entered</p>
              </div>

              {/* Verify button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-md py-3 font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="animate-spin" size={16} />Verifying…</>
                ) : "Verify OTP"}
              </button>

              {/* Resend panel */}
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-2">
                {/* Badge */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Resends remaining</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full ${resendExhausted ? "bg-red-500/20 text-red-400" : resendsLeft <= 1 ? "bg-amber-500/20 text-amber-400" : "bg-cyan-500/20 text-cyan-400"}`}>
                    {resendExhausted ? "0" : resendsLeft} / {MAX_RESENDS}
                  </span>
                </div>

                {/* Countdown bar */}
                {cooldown > 0 && (
                  <div className="space-y-1">
                    <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full transition-all duration-1000"
                        style={{ width: `${(cooldown / COOLDOWN_SECONDS) * 100}%` }}
                      />
                    </div>
                    <p className="text-center text-xs text-slate-400">
                      Resend available in <span className="font-semibold text-cyan-400">{cooldown}s</span>
                    </p>
                  </div>
                )}

                {/* Resend button row */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    {resendExhausted ? "No more resends available." : "Didn't receive the code?"}
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendDisabled}
                    className={`text-sm font-semibold flex items-center gap-1.5 transition ${resendDisabled ? "text-slate-600 cursor-not-allowed" : "text-cyan-400 hover:underline"}`}
                  >
                    {loading && !loadingRef.current && <RefreshCw size={13} className="animate-spin" />}
                    {resendExhausted ? "Limit reached" : cooldown > 0 ? `Resend (${cooldown}s)` : "Resend OTP"}
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-slate-500">
                The OTP is valid for 10 minutes. Check your spam folder if you don't see it.
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