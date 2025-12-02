// icecream-inventory\src\app\verify-otp\page.tsx

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
    await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, resend: true }),
      headers: { "Content-Type": "application/json" },
    });
    toast.info("OTP resent!");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-100 p-6">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-3xl font-bold text-center text-indigo-600 mb-2">
            Verify Your Email
          </h2>
          <p className="text-center text-gray-600 mb-6 text-sm">
            We’ve sent a 6-digit OTP to{" "}
            <span className="font-semibold">{email}</span>.
          </p>

          <div className="space-y-5">
            {/* OTP Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="border border-gray-300 rounded-lg px-4 py-3 w-full text-center tracking-widest text-lg font-bold text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg w-full transition-all duration-200"
            >
              Verify OTP
            </button>

            {/* Resend OTP */}
            <p className="text-center text-sm text-gray-600">
              Didn’t receive the code?{" "}
              <button
                onClick={handleResend}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Resend OTP
              </button>
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="text-center mt-10 text-gray-500">Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
