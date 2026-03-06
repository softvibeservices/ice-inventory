// src/app/forgot-password/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Key, Loader2 } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ NEW: cooldown state — counts down from 60 to 0 after each OTP send
  const [cooldown, setCooldown] = useState(0);

  // ✅ NEW: starts a 60-second countdown, called after every successful OTP dispatch
  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* ================= REQUEST OTP ================= */
  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return toast.error("Please enter your registered email.");

    // ✅ NEW: block resend if cooldown is still active
    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown}s before requesting another OTP.`);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("OTP sent to your email.");
        setStep("otp");
        startCooldown(); // ✅ NEW: start 60s cooldown after successful send
      } else if (res.status === 404) {
        toast.error(data.error || "No account found. Please register first.", {
          autoClose: 4000,
        });
        setTimeout(() => router.push("/register"), 4000);
      } else {
        toast.error(data.error || "Failed to send OTP.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= VERIFY OTP ================= */
  const verifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!otp) return toast.error("Enter OTP.");

    try {
      setLoading(true);
      const res = await fetch("/api/forgot-password/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: "__OTP_CHECK__" }),
      });

      const data = await res.json();
      if (res.ok && data.otpValid) {
        toast.success("OTP verified. Set new password.");
        setStep("reset");
      } else {
        toast.error(data.error || "Invalid OTP.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RESET PASSWORD ================= */
  const resetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!newPassword || !confirmPassword)
      return toast.error("Fill all fields.");
    if (newPassword !== confirmPassword)
      return toast.error("Passwords do not match.");
    if (newPassword.length < 6)
      return toast.error("Password must be at least 6 characters.");

    try {
      setLoading(true);
      const res = await fetch("/api/forgot-password/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Password updated successfully! Redirecting to login...");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        toast.error(data.error || "Failed to update password.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#020617] via-[#020b2c] to-[#031136] text-white">
      <Navbar />

      {/* ===== CENTER WRAPPER ===== */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 sm:p-8">

          <h2 className="text-center text-2xl sm:text-3xl font-bold text-cyan-400">
            Forgot Password
          </h2>

          <p className="mt-2 text-center text-sm sm:text-base text-slate-300">
            {step === "email" && "Enter your registered email to receive an OTP"}
            {step === "otp" && "Enter the OTP sent to your email"}
            {step === "reset" && "Create a new secure password"}
          </p>

          {/* ===== EMAIL STEP ===== */}
          {step === "email" && (
            <form onSubmit={requestOtp} className="mt-6 space-y-5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Registered email"
                  required
                  className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white placeholder-slate-400 outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 rounded-md py-3 font-semibold transition
                  ${
                    loading
                      ? "bg-cyan-600/70 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90"
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Sending OTP…
                  </>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          )}

          {/* ===== OTP STEP ===== */}
          {step === "otp" && (
            <form onSubmit={verifyOtp} className="mt-6 space-y-5">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  maxLength={6}
                  required
                  className="w-full text-center tracking-widest text-lg font-semibold
                             rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3
                             text-white placeholder-slate-400 outline-none focus:border-cyan-400"
                />
              </div>

              {/* ✅ NEW: cooldown hint shown when timer is active */}
              {cooldown > 0 && (
                <p className="text-center text-xs text-slate-400">
                  You can resend OTP in{" "}
                  <span className="text-cyan-400 font-semibold">{cooldown}s</span>
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-md py-3 font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition disabled:opacity-70"
                >
                  {loading ? "Verifying…" : "Verify OTP"}
                </button>

                {/* ✅ UPDATED: Resend button disabled during cooldown, shows live countdown */}
                <button
                  type="button"
                  onClick={requestOtp}
                  disabled={loading || cooldown > 0}
                  className="flex-1 rounded-md py-3 border border-white/20 text-slate-300 hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend"}
                </button>
              </div>
            </form>
          )}

          {/* ===== RESET STEP ===== */}
          {step === "reset" && (
            <form onSubmit={resetPassword} className="mt-6 space-y-5">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  required
                  className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md py-3 font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition disabled:opacity-70"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}

          {/* ===== BACK LINK ===== */}
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
      <ToastContainer position="top-right" theme="dark" />
    </div>
  );
}