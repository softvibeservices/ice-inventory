// src/app/verify-account/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Key, Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const COOLDOWN_SECONDS = 60;
const MAX_RESENDS = 3;

export default function VerifyAccountPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendsLeft, setResendsLeft] = useState(MAX_RESENDS);
  const [resendExhausted, setResendExhausted] = useState(false);
  const loadingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const startCooldown = useCallback((seconds = COOLDOWN_SECONDS) => {
    setCooldown(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current!); intervalRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleRequestOtp = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loadingRef.current || loading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { toast.error("Please enter your registered email."); return; }
    if (cooldown > 0) { toast.error(`Please wait ${cooldown}s before requesting another OTP.`); return; }
    loadingRef.current = true; setLoading(true);
    try {
      const res = await fetch("/api/verify-account", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();
      if (res.ok) { toast.success("Verification OTP sent!"); setStep("otp"); startCooldown(); }
      else if (res.status === 404) {
        toast.error(data.error || "No account found. Please register first.", { autoClose: 4000 });
        setTimeout(() => router.push("/register"), 4000);
      } else if (res.status === 400 && data.error?.toLowerCase().includes("already verified")) {
        toast.success("Account already verified! Redirecting to login…");
        setTimeout(() => router.push("/login"), 2500);
      } else if (res.status === 429) {
        const wait = data?.waitSeconds ?? data?.retryAfterSeconds ?? COOLDOWN_SECONDS;
        toast.error(`Please wait ${wait}s.`); startCooldown(wait);
      } else {
        toast.error(data.error || "Failed to send OTP. Please try again.");
      }
    } catch { toast.error("Network error. Please check your connection."); }
    finally { setLoading(false); loadingRef.current = false; }
  }, [email, loading, cooldown, router, startCooldown]);

  const handleVerifyOtp = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loadingRef.current || loading) return;
    if (!otp || otp.length !== 6) { toast.error("Please enter the full 6-digit OTP."); return; }
    loadingRef.current = true; setLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      const data = await res.json();
      if (res.status === 429) { toast.error("Too many attempts. Please wait before trying again."); return; }
      if (res.ok) { toast.success("Account verified! Redirecting to login…"); setTimeout(() => router.push("/login"), 2000); }
      else toast.error(data.error || "Invalid OTP. Please try again.");
    } catch { toast.error("Network error. Please check your connection."); }
    finally { setLoading(false); loadingRef.current = false; }
  }, [email, otp, loading, router]);

  const handleResend = useCallback(async () => {
    if (loadingRef.current || loading || cooldown > 0 || resendExhausted) return;
    loadingRef.current = true; setLoading(true);
    try {
      const res = await fetch("/api/register/resend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.status === 429) {
        const wait = data?.waitSeconds ?? data?.retryAfterSeconds ?? COOLDOWN_SECONDS;
        if (data?.retryAfterSeconds) { setResendExhausted(true); toast.error("Resend limit reached."); }
        else { toast.error(`Please wait ${wait}s.`); startCooldown(wait); }
        return;
      }
      if (!res.ok) { toast.error(data?.error || "Unable to resend OTP."); return; }
      toast.success("A new OTP has been sent.");
      setResendsLeft((prev) => { const next = prev - 1; if (next <= 0) setResendExhausted(true); return Math.max(0, next); });
      startCooldown(); setOtp("");
    } catch { toast.error("Network error."); }
    finally { setLoading(false); loadingRef.current = false; }
  }, [email, loading, cooldown, resendExhausted, startCooldown]);

  const resendDisabled = loading || cooldown > 0 || resendExhausted;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Verify your account</h1>
            <p className="text-sm text-gray-500">
              {step === "email" ? "Enter your registered email to receive a verification code." : `Enter the OTP sent to ${email}`}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-0 mb-8">
            {[{ label: "Email" }, { label: "OTP" }].map((s, i) => (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    (i === 0 && step === "otp") ? "bg-blue-600 text-white" : i === (step === "email" ? 0 : 1) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}>
                    {i === 0 && step === "otp" ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${(i === 0 && step === "otp") || i === (step === "email" ? 0 : 1) ? "text-blue-600" : "text-gray-400"}`}>{s.label}</span>
                </div>
                {i < 1 && <div className={`w-16 h-px mb-5 mx-1 transition-colors ${step === "otp" ? "bg-blue-600" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

            {/* STEP 1: EMAIL */}
            {step === "email" && (
              <form onSubmit={handleRequestOtp} className="space-y-5" noValidate>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com" required autoFocus autoComplete="email" disabled={loading}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
                      style={{ paddingLeft: "36px" }} />
                  </div>
                </div>
                <button type="submit" disabled={loading || cooldown > 0}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors">
                  {loading ? <><Loader2 className="animate-spin" size={16} />Sending…</> : cooldown > 0 ? `Wait ${cooldown}s` : "Send Verification OTP"}
                </button>
                <div className="flex flex-col gap-1 text-center">
                  <span className="text-sm text-gray-500">
                    No account?{" "}
                    <a href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">Register</a>
                  </span>
                  <span className="text-sm text-gray-500">
                    Already verified?{" "}
                    <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Login</a>
                  </span>
                </div>
              </form>
            )}

            {/* STEP 2: OTP */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
                {/* Email badge */}
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
                  <Mail className="text-blue-500 shrink-0" size={14} />
                  <span className="text-sm text-gray-700 break-all">{email}</span>
                  <button type="button" onClick={() => { setStep("email"); setOtp(""); }}
                    className="ml-auto text-xs text-gray-400 hover:text-blue-600 transition shrink-0 font-medium">
                    Change
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 text-center">6-Digit OTP</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input type="text" value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                      placeholder="––––––" maxLength={6} inputMode="numeric" autoComplete="one-time-code"
                      autoFocus disabled={loading}
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-3 text-center tracking-[0.6em] text-xl font-bold text-gray-900 placeholder-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 transition"
                      style={{ fontFamily: "'DM Mono', monospace" }} />
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-1">{otp.length} / 6 digits</p>
                </div>

                <button type="submit" disabled={loading || otp.length !== 6}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors">
                  {loading ? <><Loader2 className="animate-spin" size={16} />Verifying…</> : "Verify OTP"}
                </button>

                {/* Resend panel */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Resends remaining</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${resendExhausted ? "bg-red-50 text-red-500" : resendsLeft <= 1 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                      {resendExhausted ? "0" : resendsLeft} / {MAX_RESENDS}
                    </span>
                  </div>
                  {cooldown > 0 && (
                    <div className="space-y-1.5">
                      <div className="w-full h-1 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                          style={{ width: `${(cooldown / COOLDOWN_SECONDS) * 100}%` }} />
                      </div>
                      <p className="text-center text-xs text-gray-400">
                        Resend in <span className="font-semibold text-blue-600">{cooldown}s</span>
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {resendExhausted ? "No more resends." : "Didn't receive it?"}
                    </span>
                    <button type="button" onClick={handleResend} disabled={resendDisabled}
                      className={`text-sm font-semibold flex items-center gap-1.5 transition ${resendDisabled ? "text-gray-300 cursor-not-allowed" : "text-blue-600 hover:text-blue-700"}`}>
                      {loading && <RefreshCw size={12} className="animate-spin" />}
                      {resendExhausted ? "Limit reached" : cooldown > 0 ? `Resend (${cooldown}s)` : "Resend OTP"}
                    </button>
                  </div>
                </div>

                <p className="text-center text-xs text-gray-400">OTP is valid for 10 minutes. Check your spam folder.</p>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="light" autoClose={3000} />
    </div>
  );
}