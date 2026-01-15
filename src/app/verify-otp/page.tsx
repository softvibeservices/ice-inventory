// ice-inventory\src\app\verify-otp\page.tsx

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function VerifyOtpContent() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") || "";
  const [otp, setOtp] = useState("");

  /* ===== LOGIC UNCHANGED ===== */

  const handleVerify = async () => {
    const res = await fetch("/api/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (res.ok) {
      toast.success("OTP verified! Redirecting...");
      setTimeout(() => router.push("/login"), 2000);
    } else {
      toast.error(data.error || "Invalid OTP!");
    }
  };

  const handleResend = async () => {
    try {
      const res = await fetch("/api/register/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.waitSeconds) {
          toast.error(`Please wait ${data.waitSeconds}s before resending.`);
        } else {
          toast.error(data.error || "Unable to resend OTP");
        }
        return;
      }
      toast.success("OTP resent to your email.");
    } catch {
      toast.error("Network error while resending OTP");
    }
  };

  /* ===== UI FIX ONLY ===== */

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#020617] via-[#020b2c] to-[#031136] text-white">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-8 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-cyan-400 mb-2">
            Verify Your Email
          </h2>

          <p className="text-center text-slate-300 text-sm sm:text-base mb-6">
            We’ve sent a 6-digit OTP to{" "}
            <span className="font-semibold text-white break-all">{email}</span>
          </p>

          <div className="space-y-5">
            {/* OTP INPUT */}
            <div>
              <label className="block text-sm text-slate-300 mb-1 text-center">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
                className="w-full rounded-md bg-white/10 border border-white/20 px-4 py-3 text-center tracking-widest text-lg font-semibold text-white placeholder-slate-400 outline-none focus:border-cyan-400"
              />
            </div>

            {/* VERIFY BUTTON */}
            <button
              onClick={handleVerify}
              className="w-full rounded-md py-3 font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition"
            >
              Verify OTP
            </button>

            {/* RESEND */}
            <p className="text-center text-sm text-slate-300">
              Didn’t receive the code?{" "}
              <button
                onClick={handleResend}
                className="font-semibold text-cyan-400 hover:underline"
              >
                Resend OTP
              </button>
            </p>
          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="dark" />
    </div>
  );
}

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
