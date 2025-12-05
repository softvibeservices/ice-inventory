// src/app/forgot-password/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Key } from "lucide-react";
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

  // 1) Request OTP
  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return toast.error("Please enter your registered email.");

    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "OTP sent to your email.");
        setStep("otp");
      } else {
        toast.error(data.error || "Failed to send OTP.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  // 2) Verify OTP (simple client step — server also validates in verify endpoint)
  const verifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!otp) return toast.error("Enter OTP.");

    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: "__OTP_CHECK__" }),
      });

      const data = await res.json();
      if (res.ok && data.otpValid) {
        toast.success("OTP verified. Enter new password.");
        setStep("reset");
      } else {
        toast.error(data.error || "Invalid or expired OTP.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  // 3) Reset password
  const resetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newPassword || !confirmPassword) return toast.error("Fill both password fields.");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");
    if (newPassword.length < 6) return toast.error("Password should be at least 6 characters.");

    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Password updated. Redirecting to login...");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        toast.error(data.error || "Failed to update password.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-200">
      <Navbar />
      <main className="flex-grow flex items-center justify-center px-4 py-10">
        <div
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
          style={{
            /* subtle inner elevation to separate inputs from background */
            boxShadow:
              "0 10px 30px rgba(2,6,23,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
            border: "1px solid rgba(14,165,233,0.06)",
          }}
        >
          <h2 className="text-2xl font-bold text-center text-blue-700 mb-2">Forgot Password</h2>
          <p className="text-center text-gray-700 mb-6">Enter your registered email to receive an OTP.</p>

          {step === "email" && (
            <form onSubmit={requestOtp} className="space-y-4">
              <div className="relative">
                {/* icon vertically centered and higher contrast */}
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  aria-label="Registered email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Registered email"
                  className="text-gray-700 w-full border border-gray-200 pl-11 pr-3 py-3 rounded-lg bg-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 focus:ring-offset-white shadow-sm"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-lg hover:scale-[1.02] transition-transform disabled:opacity-70"
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="relative">
                <Key
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  aria-label="Enter 6-digit OTP"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="text-gray-700 w-full border border-gray-200 pl-11 pr-3 py-3 rounded-lg bg-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 focus:ring-offset-white shadow-sm"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-70"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>

                <button
                  onClick={requestOtp}
                  type="button"
                  className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-lg bg-white hover:bg-gray-50 transition"
                  disabled={loading}
                >
                  Resend
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={resetPassword} className="space-y-4">
              <div className="relative">
                <Key
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  aria-label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="text-gray-700 w-full border border-gray-200 pl-11 pr-3 py-3 rounded-lg bg-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 focus:ring-offset-white shadow-sm"
                  required
                />
              </div>

              <div className="relative">
                <Key
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  aria-label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="text-gray-700 w-full border border-gray-200 pl-11 pr-3 py-3 rounded-lg bg-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 focus:ring-offset-white shadow-sm"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-lg hover:scale-[1.02] transition-transform disabled:opacity-70"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          <div className="mt-4 text-center text-sm text-gray-600">
            <button
              className="text-blue-600 hover:underline"
              onClick={() => router.push("/login")}
            >
              Back to login
            </button>
          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
