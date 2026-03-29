// src/app/verify-otp/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Mail, RefreshCw, ShieldCheck } from "lucide-react";

// ─── Constants (must match server-side) ──────────────────────────────────────

/** Cooldown enforced by the server between resend requests */
const RESEND_COOLDOWN_SECONDS = 60;
/** Total resend attempts allowed per IP per hour (from rateLimit config) */
const MAX_RESENDS = 3;

// ─── Inner component (needs useSearchParams → must be inside Suspense) ────────

function VerifyOtpContent() {
  const params = useSearchParams();
  const router = useRouter();

  const email = params.get("email") ?? "";

  // ── OTP state ──────────────────────────────────────────────────────────────
  const [otp,          setOtp]          = useState("");
  const [verifying,    setVerifying]    = useState(false);

  // ── Resend state ───────────────────────────────────────────────────────────
  const [resending,       setResending]       = useState(false);
  const [cooldown,        setCooldown]        = useState(0);       // seconds left
  const [resendsLeft,     setResendsLeft]     = useState(MAX_RESENDS);
  const [resendExhausted, setResendExhausted] = useState(false);

  // Debounce refs
  const verifyingRef  = useRef(false);
  const resendingRef  = useRef(false);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Redirect if no email in URL ────────────────────────────────────────────
  useEffect(() => {
    if (!email) router.replace("/register");
  }, [email, router]);

  // ── Cooldown timer ─────────────────────────────────────────────────────────
  const startCooldown = useCallback((seconds: number) => {
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

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits only, max 6
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(digits);
  };

  const handleVerify = useCallback(async () => {
    if (verifyingRef.current || verifying) return;

    if (!otp || otp.length !== 6) {
      toast.error("Please enter the full 6-digit OTP.");
      return;
    }

    verifyingRef.current = true;
    setVerifying(true);

    try {
      const res = await fetch("/api/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (res.status === 429) {
        const wait = data?.retryAfterSeconds
          ? ` Please wait ${data.retryAfterSeconds}s.`
          : "";
        toast.error(`Too many attempts.${wait}`);
        return;
      }

      if (!res.ok) {
        toast.error(data?.error || "Invalid OTP. Please try again.");
        return;
      }

      toast.success("Email verified! Redirecting to login…");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setVerifying(false);
      verifyingRef.current = false;
    }
  }, [email, otp, verifying, router]);

  // Allow Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleVerify();
  };

  const handleResend = useCallback(async () => {
    if (resendingRef.current || resending || cooldown > 0 || resendExhausted) return;

    resendingRef.current = true;
    setResending(true);

    try {
      const res = await fetch("/api/register/resend", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.status === 429) {
        // Could be IP-level rate limit or per-user cooldown
        const wait = data?.waitSeconds ?? data?.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS;

        if (data?.retryAfterSeconds) {
          // IP-level exhaustion
          setResendExhausted(true);
          toast.error("Resend limit reached. Please try again later.");
        } else {
          // Per-user cooldown
          toast.error(`Please wait ${wait}s before requesting a new code.`);
          startCooldown(wait);
        }
        return;
      }

      if (!res.ok) {
        toast.error(data?.error || "Unable to resend OTP. Please try again.");
        return;
      }

      // Success
      toast.success("A new OTP has been sent to your email.");
      setResendsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) setResendExhausted(true);
        return Math.max(0, next);
      });
      startCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp(""); // clear stale OTP input
    } catch {
      toast.error("Network error while resending OTP.");
    } finally {
      setResending(false);
      resendingRef.current = false;
    }
  }, [email, resending, cooldown, resendExhausted, startCooldown]);

  // ── Derived UI state ───────────────────────────────────────────────────────

  const resendDisabled = resending || cooldown > 0 || resendExhausted;
  const verifyDisabled = verifying || otp.length !== 6;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#020617] via-[#020b2c] to-[#031136] text-white">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-8 sm:p-10">

          {/* Header */}
          <div className="flex flex-col items-center mb-6 gap-2">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-1">
              <ShieldCheck size={28} className="text-cyan-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-cyan-400">
              Verify Your Email
            </h2>
            <p className="text-center text-slate-300 text-sm sm:text-base">
              We've sent a 6-digit code to
            </p>
            <div className="flex items-center gap-1.5 text-white font-semibold text-sm bg-white/10 rounded-lg px-3 py-1.5 break-all">
              <Mail size={14} className="text-cyan-400 shrink-0" />
              <span>{email || "your email"}</span>
            </div>
          </div>

          <div className="space-y-5">

            {/* OTP INPUT */}
            <div>
              <label className="block text-sm text-slate-300 mb-1 text-center">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={handleOtpChange}
                onKeyDown={handleKeyDown}
                placeholder="••••••"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                disabled={verifying}
                className="w-full rounded-md bg-white/10 border border-white/20 px-4 py-3 text-center tracking-[0.5em] text-xl font-bold text-white placeholder-slate-600 outline-none focus:border-cyan-400 disabled:opacity-50 transition"
              />
              {/* Live digit counter */}
              <p className="text-center text-xs text-slate-500 mt-1">
                {otp.length} / 6 digits entered
              </p>
            </div>

            {/* VERIFY BUTTON */}
            <button
              onClick={handleVerify}
              disabled={verifyDisabled}
              className="w-full rounded-md py-3 font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Verifying…
                </>
              ) : (
                "Verify OTP"
              )}
            </button>

            {/* RESEND SECTION */}
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-2">

              {/* Resends remaining badge */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Resends remaining</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full ${
                    resendExhausted
                      ? "bg-red-500/20 text-red-400"
                      : resendsLeft <= 1
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-cyan-500/20 text-cyan-400"
                  }`}
                >
                  {resendExhausted ? "0" : resendsLeft} / {MAX_RESENDS}
                </span>
              </div>

              {/* Cooldown progress bar */}
              {cooldown > 0 && (
                <div className="space-y-1">
                  <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-1000"
                      style={{
                        width: `${(cooldown / RESEND_COOLDOWN_SECONDS) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-400">
                    Resend available in{" "}
                    <span className="font-semibold text-cyan-400">{cooldown}s</span>
                  </p>
                </div>
              )}

              {/* Resend button */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">
                  {resendExhausted
                    ? "No more resends available."
                    : "Didn't receive the code?"}
                </span>
                <button
                  onClick={handleResend}
                  disabled={resendDisabled}
                  className={`text-sm font-semibold flex items-center gap-1.5 transition ${
                    resendDisabled
                      ? "text-slate-600 cursor-not-allowed"
                      : "text-cyan-400 hover:underline"
                  }`}
                >
                  {resending && <RefreshCw size={13} className="animate-spin" />}
                  {resendExhausted
                    ? "Limit reached"
                    : cooldown > 0
                    ? `Resend (${cooldown}s)`
                    : "Resend OTP"}
                </button>
              </div>
            </div>

            {/* Back to register */}
            <p className="text-center text-xs text-slate-500">
              Wrong email?{" "}
              <a href="/register" className="text-cyan-400 hover:underline font-semibold">
                Go back to Register
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="dark" />
    </div>
  );
}

// ─── Page shell (Suspense required for useSearchParams in Next.js App Router) ──

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-400">
          Loading…
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}