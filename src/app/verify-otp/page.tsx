// src/app/verify-otp/page.tsx

"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Mail, RefreshCw, Loader2 } from "lucide-react";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS = 3;

function VerifyOtpContent() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendsLeft, setResendsLeft] = useState(MAX_RESENDS);
  const [resendExhausted, setResendExhausted] = useState(false);

  const verifyingRef = useRef(false);
  const resendingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (!email) router.replace("/register"); }, [email, router]);
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current!); intervalRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handleVerify = useCallback(async () => {
    if (verifyingRef.current || verifying) return;
    if (!otp || otp.length !== 6) { toast.error("Please enter the full 6-digit OTP."); return; }
    verifyingRef.current = true; setVerifying(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.status === 429) {
        const wait = data?.retryAfterSeconds ? ` Please wait ${data.retryAfterSeconds}s.` : "";
        toast.error(`Too many attempts.${wait}`); return;
      }
      if (!res.ok) { toast.error(data?.error || "Invalid OTP. Please try again."); return; }
      toast.success("Email verified! Redirecting to login…");
      setTimeout(() => router.push("/login"), 2000);
    } catch { toast.error("Network error. Please check your connection."); }
    finally { setVerifying(false); verifyingRef.current = false; }
  }, [email, otp, verifying, router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleVerify();
  };

  const handleResend = useCallback(async () => {
    if (resendingRef.current || resending || cooldown > 0 || resendExhausted) return;
    resendingRef.current = true; setResending(true);
    try {
      const res = await fetch("/api/register/resend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.status === 429) {
        const wait = data?.waitSeconds ?? data?.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS;
        if (data?.retryAfterSeconds) { setResendExhausted(true); toast.error("Resend limit reached."); }
        else { toast.error(`Please wait ${wait}s.`); startCooldown(wait); }
        return;
      }
      if (!res.ok) { toast.error(data?.error || "Unable to resend OTP."); return; }
      toast.success("A new OTP has been sent to your email.");
      setResendsLeft((prev) => { const next = prev - 1; if (next <= 0) setResendExhausted(true); return Math.max(0, next); });
      startCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp("");
    } catch { toast.error("Network error while resending OTP."); }
    finally { setResending(false); resendingRef.current = false; }
  }, [email, resending, cooldown, resendExhausted, startCooldown]);

  const resendDisabled = resending || cooldown > 0 || resendExhausted;
  const verifyDisabled = verifying || otp.length !== 6;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
            <p className="text-sm text-gray-500 mb-2">We&apos;ve sent a 6-digit code to</p>
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5">
              <Mail size={13} className="text-blue-500" />
              <span className="text-sm font-semibold text-blue-700 break-all">{email || "your email"}</span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5">

            {/* OTP INPUT */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 text-center">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={handleOtpChange}
                onKeyDown={handleKeyDown}
                placeholder="––––––"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                disabled={verifying}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-center tracking-[0.6em] text-2xl font-bold text-gray-900 placeholder-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 transition"
                style={{ fontFamily: "'DM Mono', monospace" }}
              />
              <p className="text-center text-xs text-gray-400 mt-1.5">{otp.length} / 6 digits entered</p>
            </div>

            {/* VERIFY BUTTON */}
            <button
              onClick={handleVerify}
              disabled={verifyDisabled}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              {verifying ? (
                <><Loader2 size={16} className="animate-spin" />Verifying…</>
              ) : "Verify & Continue"}
            </button>

            {/* RESEND SECTION */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Resends remaining</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  resendExhausted ? "bg-red-50 text-red-500" : resendsLeft <= 1 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                }`}>
                  {resendExhausted ? "0" : resendsLeft} / {MAX_RESENDS}
                </span>
              </div>

              {cooldown > 0 && (
                <div className="space-y-1.5">
                  <div className="w-full h-1 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(cooldown / RESEND_COOLDOWN_SECONDS) * 100}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-gray-400">
                    Resend available in <span className="font-semibold text-blue-600">{cooldown}s</span>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {resendExhausted ? "No more resends available." : "Didn't receive the code?"}
                </span>
                <button
                  onClick={handleResend}
                  disabled={resendDisabled}
                  className={`text-sm font-semibold flex items-center gap-1.5 transition ${
                    resendDisabled ? "text-gray-300 cursor-not-allowed" : "text-blue-600 hover:text-blue-700"
                  }`}
                >
                  {resending && <RefreshCw size={12} className="animate-spin" />}
                  {resendExhausted ? "Limit reached" : cooldown > 0 ? `Resend (${cooldown}s)` : "Resend OTP"}
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400">
              OTP is valid for 10 minutes. Check your spam folder if you don&apos;t see it.
            </p>
          </div>

          <p className="text-center mt-4">
            <a href="/register" className="text-sm text-gray-400 hover:text-blue-600 font-medium transition">
              ← Wrong email? Go back to Register
            </a>
          </p>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="light" autoClose={3000} />
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-400 bg-gray-50">
        Loading…
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}