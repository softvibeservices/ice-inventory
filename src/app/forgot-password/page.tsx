// src/app/forgot-password/page.tsx

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Key, Lock, Eye, EyeOff, Loader2, RefreshCw, CheckCircle } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const COOLDOWN_SECONDS = 60;
const MAX_RESENDS = 3;
const PASSWORD_LIMIT = 128;

function getStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: "Weak", color: "#EF4444" };
  if (score <= 3) return { score, label: "Fair", color: "#F59E0B" };
  if (score <= 4) return { score, label: "Good", color: "#06B6D4" };
  return { score, label: "Strong", color: "#22C55E" };
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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendsLeft, setResendsLeft] = useState(MAX_RESENDS);
  const [resendExhausted, setResendExhausted] = useState(false);
  const loadingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const strength = getStrength(newPassword);

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

  const requestOtp = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loadingRef.current || loading) return;
    if (!email.trim()) { toast.error("Please enter your registered email."); return; }
    if (cooldown > 0) { toast.error(`Please wait ${cooldown}s before requesting another OTP.`); return; }
    loadingRef.current = true; setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) { toast.success("OTP sent to your email."); setStep("otp"); startCooldown(); return; }
      if (res.status === 403 && data.code === "ACCOUNT_LOCKED") {
        const wait = data.unblockAt ? ` You can reset your password in ${formatUnlockTime(data.unblockAt)}.` : "";
        toast.error(`Your account is temporarily locked.${wait}`, { autoClose: 8000 }); return;
      }
      if (res.status === 403) { toast.error(data.error || "Access denied. Please contact support.", { autoClose: 6000 }); return; }
      if (res.status === 404) {
        toast.error(data.error || "No account found. Please register first.", { autoClose: 4000 });
        setTimeout(() => router.push("/register"), 4000); return;
      }
      if (res.status === 429) {
        const wait = data?.waitSeconds ?? data?.retryAfterSeconds ?? COOLDOWN_SECONDS;
        toast.error(`Please wait ${wait}s before requesting another OTP.`); startCooldown(wait); return;
      }
      toast.error(data.error || "Failed to send OTP. Please try again.");
    } catch { toast.error("Network error. Please check your connection."); }
    finally { setLoading(false); loadingRef.current = false; }
  }, [email, loading, cooldown, router, startCooldown]);

  const verifyOtp = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loadingRef.current || loading) return;
    if (!otp || otp.length !== 6) { toast.error("Please enter the full 6-digit OTP."); return; }
    loadingRef.current = true; setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/verify", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp, newPassword: "__OTP_CHECK__" }),
      });
      const data = await res.json();
      if (res.status === 429) { toast.error("Too many attempts. Please wait before trying again."); return; }
      if (res.ok && data.otpValid) { toast.success("OTP verified. Please set your new password."); setStep("reset"); }
      else toast.error(data.error || "Invalid OTP. Please try again.");
    } catch { toast.error("Network error. Please check your connection."); }
    finally { setLoading(false); loadingRef.current = false; }
  }, [email, otp, loading]);

  const resetPassword = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loadingRef.current || loading) return;
    if (!newPassword || !confirmPassword) { toast.error("Please fill in all fields."); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    loadingRef.current = true; setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/verify", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp, newPassword }),
      });
      const data = await res.json();
      if (res.status === 429) { toast.error("Too many attempts. Please wait before trying again."); return; }
      if (res.ok) { toast.success("Password updated successfully! Redirecting to login…"); setTimeout(() => router.push("/login"), 1800); }
      else toast.error(data.error || "Failed to update password. Please try again.");
    } catch { toast.error("Network error. Please check your connection."); }
    finally { setLoading(false); loadingRef.current = false; }
  }, [email, otp, newPassword, confirmPassword, loading, router]);

  const handleResend = useCallback(async () => {
    if (loadingRef.current || loading || cooldown > 0 || resendExhausted) return;
    loadingRef.current = true; setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === "ACCOUNT_LOCKED") {
        const wait = data.unblockAt ? ` Try again in ${formatUnlockTime(data.unblockAt)}.` : "";
        toast.error(`Account locked.${wait}`, { autoClose: 8000 }); setResendExhausted(true); return;
      }
      if (res.status === 429) {
        const wait = data?.waitSeconds ?? data?.retryAfterSeconds ?? COOLDOWN_SECONDS;
        if (data?.retryAfterSeconds) { setResendExhausted(true); toast.error("Resend limit reached. Please try again later."); }
        else { toast.error(`Please wait ${wait}s before resending.`); startCooldown(wait); }
        return;
      }
      if (!res.ok) { toast.error(data?.error || "Unable to resend OTP. Please try again."); return; }
      toast.success("A new OTP has been sent to your email.");
      setResendsLeft((prev) => { const next = prev - 1; if (next <= 0) setResendExhausted(true); return Math.max(0, next); });
      startCooldown(); setOtp("");
    } catch { toast.error("Network error. Please check your connection."); }
    finally { setLoading(false); loadingRef.current = false; }
  }, [email, loading, cooldown, resendExhausted, startCooldown]);

  const resendDisabled = loading || cooldown > 0 || resendExhausted;

  const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 disabled:bg-gray-50";

  const steps = [
    { key: "email", label: "Email" },
    { key: "otp", label: "Verify OTP" },
    { key: "reset", label: "New Password" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h1>
            <p className="text-sm text-gray-500">Follow the steps to regain access to your account.</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-0 mb-8">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < stepIndex ? "bg-blue-600 text-white" : i === stepIndex ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}>
                    {i < stepIndex ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${i <= stepIndex ? "text-blue-600" : "text-gray-400"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 h-px mb-5 mx-1 transition-colors ${i < stepIndex ? "bg-blue-600" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

            {/* STEP 1: EMAIL */}
            {step === "email" && (
              <form onSubmit={requestOtp} className="space-y-5" noValidate>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Registered Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" required autoFocus autoComplete="email" disabled={loading}
                      className={inputCls} style={{ paddingLeft: "36px" }} />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">We&apos;ll send a 6-digit OTP to this address.</p>
                </div>
                <button type="submit" disabled={loading || cooldown > 0}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors">
                  {loading ? <><Loader2 className="animate-spin" size={16} />Sending…</> : cooldown > 0 ? `Wait ${cooldown}s` : "Send OTP"}
                </button>
                <p className="text-center text-sm text-gray-500">
                  Remember it?{" "}
                  <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Back to login</a>
                </p>
              </form>
            )}

            {/* STEP 2: OTP */}
            {step === "otp" && (
              <form onSubmit={verifyOtp} className="space-y-5" noValidate>
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
                      onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
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
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      resendExhausted ? "bg-red-50 text-red-500" : resendsLeft <= 1 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    }`}>
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

            {/* STEP 3: RESET */}
            {step === "reset" && (
              <form onSubmit={resetPassword} className="space-y-5" noValidate>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    New Password <span className="normal-case font-normal text-gray-300">({newPassword.length}/{PASSWORD_LIMIT})</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input type={showPwd ? "text" : "password"} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value.slice(0, PASSWORD_LIMIT))}
                      placeholder="Minimum 6 characters" required autoComplete="new-password" disabled={loading}
                      className={inputCls} style={{ paddingLeft: "36px", paddingRight: "40px" }} />
                    <button type="button" onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPwd ? "Hide password" : "Show password"}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all"
                            style={{ background: i <= strength.score ? strength.color : "#E5E7EB" }} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">
                        Strength: <span className="font-semibold" style={{ color: strength.color }}>{strength.label}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input type={showConfirmPwd ? "text" : "password"} value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value.slice(0, PASSWORD_LIMIT))}
                      onPaste={(e) => { e.preventDefault(); toast.info("Please type your password to confirm it."); }}
                      placeholder="Re-enter password" required autoComplete="new-password" disabled={loading}
                      className={inputCls} style={{ paddingLeft: "36px", paddingRight: "40px" }} />
                    <button type="button" onClick={() => setShowConfirmPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showConfirmPwd ? "Hide password" : "Show password"}>
                      {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-500" role="alert">Passwords do not match.</p>
                  )}
                </div>

                <button type="submit" disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors">
                  {loading ? <><Loader2 className="animate-spin" size={16} />Updating…</> : "Update Password"}
                </button>
              </form>
            )}
          </div>

          <p className="text-center mt-4">
            <button onClick={() => router.push("/login")} className="text-sm text-gray-400 hover:text-blue-600 font-medium transition">
              ← Back to login
            </button>
          </p>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="light" autoClose={3000} />
    </div>
  );
}