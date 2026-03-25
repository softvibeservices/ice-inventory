// src/app/login/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getOrCreateDeviceFingerprint } from "@/utils/deviceFingerprint";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ===== AUTO LOGIN ===== */
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const remember = localStorage.getItem("rememberMe");
    if (storedUser && remember === "true") {
      router.push("/dashboard");
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /* ===== SUBMIT ===== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);

      // ✅ Collect client-side device fingerprint before making the request.
      //    This runs synchronously in < 5ms and returns a stable 16-char hex
      //    string that is unique per physical device even when two devices share
      //    the same browser version, OS, and IP address.
      const clientDeviceId = getOrCreateDeviceFingerprint();

      const res = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ ...form, rememberMe, clientDeviceId }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        // Store user object
        localStorage.setItem(
          "user",
          JSON.stringify({
            _id: data.user._id,
            managerId: data.user.managerId || null,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
          })
        );

        // Store JWT for all subsequent API calls
        localStorage.setItem("token", data.token);

        // ✅ Remember Me: if checked, stays logged in for 90 days (JWT lasts 90d)
        //    If unchecked, JWT expires in 7 days.
        localStorage.setItem("rememberMe", rememberMe ? "true" : "false");

        toast.success("Login successful! Redirecting...");
        setTimeout(() => router.push("/dashboard"), 1800);
      } else {
        toast.error(data.error || "Invalid credentials!");
        setLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#020617] via-[#020b2c] to-[#031136] text-white">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col md:flex-row">

          {/* LEFT PANEL */}
          <div className="hidden md:flex md:w-1/2 flex-col justify-center px-10 bg-gradient-to-br from-cyan-600/20 to-blue-700/20 border-r border-white/10">
            <h2 className="text-3xl font-extrabold mb-4 text-cyan-400">
              Welcome Back
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Manage inventory, billing, delivery partners and analytics —
              all from one powerful dashboard.
            </p>

            <ul className="mt-6 space-y-3 text-slate-300 text-sm">
              <li>✓ Real-time stock updates</li>
              <li>✓ Expiry & delivery alerts</li>
              <li>✓ Sales & performance insights</li>
            </ul>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 px-6 sm:px-10 py-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-cyan-400 mb-2">
              Login
            </h2>
            <p className="text-center text-slate-300 mb-8 text-sm sm:text-base">
              Secure access to your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* EMAIL */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white placeholder-slate-400 outline-none focus:border-cyan-400"
                />
              </div>

              {/* PASSWORD */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white placeholder-slate-400 outline-none focus:border-cyan-400"
                />
              </div>

              {/* REMEMBER ME */}
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  id="rememberMe"
                  className="accent-cyan-500"
                />
                <label htmlFor="rememberMe">
                  Remember Me{" "}
                  <span className="text-slate-400 text-xs">(stay logged in for 90 days)</span>
                </label>
              </div>

              {/* BUTTON */}
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
                    Verifying…
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>

            {/* LINKS */}
            <div className="mt-6 text-center text-sm text-slate-300">
              <Link href="/forgot-password" className="text-cyan-400 hover:underline">
                Forgot Password?
              </Link>
              <span className="mx-2 text-slate-500">·</span>
              <Link href="/register" className="text-cyan-400 hover:underline">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-center" autoClose={3000} theme="dark" />
    </div>
  );
}