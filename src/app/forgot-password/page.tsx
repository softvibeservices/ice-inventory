// src/app/forgot-password/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Key, Lock, Eye, EyeOff, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ─── Constants (must match server) ───────────────────────────────────────────

const COOLDOWN_SECONDS = 60;
const MAX_RESENDS      = 3;
const PASSWORD_LIMIT   = 128;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 8)              score++;
  if (pwd.length >= 12)             score++;
  if (/[A-Z]/.test(pwd))            score++;
  if (/[0-9]/.test(pwd))            score++;
  if (/[^A-Za-z0-9]/.test(pwd))    score++;

  if (score <= 1) return { score, label: "Weak",   color: "bg-red-500" };
  if (score <= 3) return { score, label: "Fair",   color: "bg-amber-500" };
  if (score <= 4) return { score, label: "Good",   color: "bg-cyan-400" };
  return             { score, label: "Strong", color: "bg-green-500" };
}

/** Format a future ISO timestamp → "1 hour 43 minutes" / "52 minutes" */
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

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step,            setStep]            = useState<"email" | "otp" | "reset">("email");
  const [email,           setEmail]           = useState("");
  const [otp,             setOtp]             = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd,         setShowPwd]         = useState(false);
  const [showConfirmPwd,  setShowConfirmPwd]  = useState(false);
  const [loading,         setLoading]         = useState(false);

  const [cooldown,        setCooldown]        = useState(0);
  const [resendsLeft,     setResendsLeft]     = useState(MAX_RESENDS);
  const [resendExhausted, setResendExhausted] = useState(false);

  const loadingRef  = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const strength = getStrength(newPassword);

  // ── Cooldown timer ────────────────────────────────────────────────────────
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

  // ── Step 1: Request OTP ───────────────────────────────────────────────────
  const requestOtp = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loadingRef.current || loading) return;

    if (!email.trim()) {
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
      const res  = await fetch("/api/forgot-password/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("OTP sent to your email.");
        setStep("otp");
        startCooldown();
        return;
      }

      // ── Account locked — tell the user exactly when they can try again ──
      if (res.status === 403 && data.code === "ACCOUNT_LOCKED") {
        const wait = data.unblockAt
          ? ` You can reset your password in ${formatUnlockTime(data.unblockAt)}.`
          : "";
        toast.error(
          `Your account is temporarily locked due to too many failed login attempts.${wait}`,
          { autoClose: 8000 }
        );
        return;
      }

      // ── Permanently blocked or rejected ────────────────────────────────
      if (res.status === 403) {
        toast.error(data.error || "Access denied. Please contact support.", { autoClose: 6000 });
        return;
      }

      if (res.status === 404) {
        toast.error(data.error || "No account found. Please register first.", { autoClose: 4000 });
        setTimeout(() => router.push("/register"), 4000);
        return;
      }

      if (res.status === 429) {
        const wait = data?.waitSeconds ?? data?.retryAfterSeconds ?? COOLDOWN_SECONDS;
        toast.error(`Please wait ${wait}s before requesting another OTP.`);
        startCooldown(wait);
        return;
      }

      toast.error(data.error || "Failed to send OTP. Please try again.");
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [email, loading, cooldown, router, startCooldown]);

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const verifyOtp = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loadingRef.current || loading) return;

    if (!otp || otp.length !== 6) {
      toast.error("Please enter the full 6-digit OTP.");
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    try {
      const res  = await fetch("/api/forgot-password/verify", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), otp, newPassword: "__OTP_CHECK__" }),
      });
      const data = await res.json();

      if (res.status === 429) {
        toast.error("Too many attempts. Please wait before trying again.");
        return;
      }

      if (res.ok && data.otpValid) {
        toast.success("OTP verified. Please set your new password.");
        setStep("reset");
      } else {
        toast.error(data.error || "Invalid OTP. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [email, otp, loading]);

  // ── Step 3: Reset Password ────────────────────────────────────────────────
  const resetPassword = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loadingRef.current || loading) return;

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    try {
      const res  = await fetch("/api/forgot-password/verify", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), otp, newPassword }),
      });
      const data = await res.json();

      if (res.status === 429) {
        toast.error("Too many attempts. Please wait before trying again.");
        return;
      }

      if (res.ok) {
        toast.success("Password updated successfully! Redirecting to login…");
        setTimeout(() => router.push("/login"), 1800);
      } else {
        toast.error(data.error || "Failed to update password. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [email, otp, newPassword, confirmPassword, loading, router]);

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (loadingRef.current || loading || cooldown > 0 || resendExhausted) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const res  = await fetch("/api/forgot-password/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.status === 403 && data.code === "ACCOUNT_LOCKED") {
        // Lockout was re-triggered between the first OTP and now (edge case)
        const wait = data.unblockAt
          ? ` Try again in ${formatUnlockTime(data.unblockAt)}.`
          : "";
        toast.error(`Account locked.${wait}`, { autoClose: 8000 });
        setResendExhausted(true);
        return;
      }

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

  const resendDisabled = loading || cooldown > 0 || resendExhausted;

  const inputCls =
    "w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white placeholder-slate-400 outline-none focus:border-cyan-400 disabled:opacity-50 transition";

  // ── Render ────────────────────────────────────────────────────────────────
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
            <h2 className="text-center text-2xl sm:text-3xl font-bold text-cyan-400">
              Forgot Password
            </h2>
            <p className="mt-2 text-center text-sm sm:text-base text-slate-300">
              {step === "email" && "Enter your registered email to receive an OTP"}
              {step === "otp"   && "Enter the OTP sent to your email"}
              {step === "reset" && "Create a new secure password"}
            </p>
          </div>

          {/* ── STEP 1: EMAIL ── */}
          {step === "email" && (
            <form onSubmit={requestOtp} className="space-y-5" noValidate>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Registered email"
                  required
                  autoFocus
                  autoComplete="email"
                  disabled={loading}
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full flex items-center justify-center gap-2 rounded-md py-3 font-semibold transition bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 className="animate-spin" size={18} />Sending OTP…</>
                  : cooldown > 0 ? `Wait ${cooldown}s` : "Send OTP"}
              </button>

              <p className="text-center text-sm text-slate-300">
                Remembered it?{" "}
                <a href="/login" className="text-cyan-400 hover:underline font-semibold">
                  Back to login
                </a>
              </p>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && (
            <form onSubmit={verifyOtp} className="space-y-5" noValidate>

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
                    onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
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

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-md py-3 font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 className="animate-spin" size={16} />Verifying…</>
                  : "Verify OTP"}
              </button>

              {/* Resend panel */}
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Resends remaining</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full ${
                    resendExhausted
                      ? "bg-red-500/20 text-red-400"
                      : resendsLeft <= 1
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-cyan-500/20 text-cyan-400"
                  }`}>
                    {resendExhausted ? "0" : resendsLeft} / {MAX_RESENDS}
                  </span>
                </div>

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

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    {resendExhausted ? "No more resends available." : "Didn't receive the code?"}
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendDisabled}
                    className={`text-sm font-semibold flex items-center gap-1.5 transition ${
                      resendDisabled ? "text-slate-600 cursor-not-allowed" : "text-cyan-400 hover:underline"
                    }`}
                  >
                    {loading && <RefreshCw size={13} className="animate-spin" />}
                    {resendExhausted ? "Limit reached" : cooldown > 0 ? `Resend (${cooldown}s)` : "Resend OTP"}
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-slate-500">
                OTP is valid for 10 minutes. Check your spam folder if you don't see it.
              </p>
            </form>
          )}

          {/* ── STEP 3: RESET PASSWORD ── */}
          {step === "reset" && (
            <form onSubmit={resetPassword} className="space-y-5" noValidate>

              {/* New password */}
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  New Password
                  <span className="ml-1 text-xs text-slate-500">({newPassword.length}/{PASSWORD_LIMIT})</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPwd ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value.slice(0, PASSWORD_LIMIT))}
                    placeholder="Minimum 6 characters"
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-10 text-white placeholder-slate-400 outline-none focus:border-cyan-400 disabled:opacity-50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i <= strength.score ? strength.color : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-400">
                      Strength: <span className="font-semibold text-white">{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="mb-1 block text-sm text-slate-300">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showConfirmPwd ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value.slice(0, PASSWORD_LIMIT))}
                    onPaste={(e) => {
                      e.preventDefault();
                      toast.info("Please type your password to confirm it.");
                    }}
                    placeholder="Re-enter password"
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-10 text-white placeholder-slate-400 outline-none focus:border-cyan-400 disabled:opacity-50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    aria-label={showConfirmPwd ? "Hide password" : "Show password"}
                  >
                    {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-400" role="alert">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                className="w-full flex items-center justify-center gap-2 rounded-md py-3 font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 className="animate-spin" size={16} />Updating…</>
                  : "Update Password"}
              </button>
            </form>
          )}

          {/* Back link */}
          <div className="mt-6 text-center text-sm text-slate-300">
            <button
              onClick={() => router.push("/login")}
              className="text-cyan-400 font-semibold hover:underline"
            >
              Back to login
            </button>
          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="dark" autoClose={3000} />
    </div>
  );
}