// src/app/register/page.tsx

"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { User, Mail, Store, MapPin, Lock, Eye, EyeOff, FileText, Phone, Loader2 } from "lucide-react";

const LIMITS = {
  name: 80, email: 254, contact: 10, shopName: 120,
  shopAddress: 500, gstin: 15, password: 128,
} as const;

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

interface FormState {
  name: string; email: string; contact: string; shopName: string;
  shopAddress: string; gstin: string; password: string; confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "", email: "", contact: "", shopName: "",
    shopAddress: "", gstin: "", password: "", confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [gstinError, setGstinError] = useState("");
  const submittingRef = useRef(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const limit = LIMITS[name as keyof typeof LIMITS];
    setForm((prev) => ({ ...prev, [name]: limit ? value.slice(0, limit) : value }));
  }, []);

  const handleContactChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, LIMITS.contact);
    setForm((prev) => ({ ...prev, contact: digits }));
  }, []);

  const handleGSTINChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LIMITS.gstin);
    setForm((prev) => ({ ...prev, gstin: value }));
    if (!value) setGstinError("GSTIN is required.");
    else if (value.length !== 15) setGstinError("GSTIN must be exactly 15 characters.");
    else if (!GSTIN_REGEX.test(value)) setGstinError("Enter a valid GSTIN (e.g., 27ABCDE1234F1Z5).");
    else setGstinError("");
  }, []);

  const preventPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.info("Please type your password to confirm it.");
  }, []);

  const validate = (): boolean => {
    const { name, email, contact, shopName, shopAddress, gstin, password, confirmPassword } = form;
    if (!name || !email || !contact || !shopName || !shopAddress || !gstin || !password || !confirmPassword) {
      toast.error("Please fill in all fields."); return false;
    }
    if (!/^[0-9]{10}$/.test(contact)) { toast.error("Enter a valid 10-digit contact number."); return false; }
    if (!GSTIN_REGEX.test(gstin)) { toast.error("Invalid GSTIN format."); return false; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return false; }
    if (password !== confirmPassword) { toast.error("Passwords do not match."); return false; }
    if (gstinError) { toast.error(gstinError); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    if (!validate()) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), email: form.email.trim().toLowerCase(),
          contact: form.contact, shopName: form.shopName.trim(),
          shopAddress: form.shopAddress.trim(), gstin: form.gstin, password: form.password, _hp: "",
        }),
      });
      const data = await res.json();
      if (res.status === 429) {
        const wait = data?.retryAfterSeconds ? ` Please wait ${data.retryAfterSeconds} seconds.` : "";
        toast.error(`Too many attempts.${wait}`); return;
      }
      if (!res.ok) { toast.error(data?.error || "Registration failed. Please try again."); return; }
      toast.success("OTP sent to your email!");
      router.replace(`/verify-otp?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const inputCls = (hasError?: boolean) =>
    `w-full bg-white border ${hasError ? "border-red-400" : "border-gray-200"} rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 disabled:bg-gray-50`;

  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
            <p className="text-gray-500 text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign in</Link>
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

            {/* Honeypot */}
            <input type="text" name="_hp" defaultValue="" autoComplete="off" tabIndex={-1} aria-hidden="true" style={{ display: "none" }} readOnly />

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* FULL NAME */}
                <div>
                  <label className={labelCls}>
                    Full Name <span className="normal-case font-normal text-gray-300">({form.name.length}/{LIMITS.name})</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input name="name" value={form.name} onChange={handleChange} maxLength={LIMITS.name}
                      placeholder="Nitrajsinh Solanki" required autoComplete="name" disabled={loading}
                      className={inputCls()} style={{ paddingLeft: "36px" }} />
                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <label className={labelCls}>
                    Email <span className="normal-case font-normal text-gray-300">({form.email.length}/{LIMITS.email})</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input name="email" type="email" value={form.email} onChange={handleChange} maxLength={LIMITS.email}
                      placeholder="you@example.com" required autoComplete="email" disabled={loading}
                      className={inputCls()} style={{ paddingLeft: "36px" }} />
                  </div>
                </div>

                {/* CONTACT */}
                <div>
                  <label className={labelCls}>
                    Contact Number <span className="normal-case font-normal text-gray-300">({form.contact.length}/{LIMITS.contact})</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input name="contact" type="tel" value={form.contact} onChange={handleContactChange}
                      maxLength={LIMITS.contact} placeholder="10-digit mobile" required autoComplete="tel"
                      inputMode="numeric" disabled={loading} className={inputCls()} style={{ paddingLeft: "36px" }} />
                  </div>
                </div>

                {/* SHOP NAME */}
                <div>
                  <label className={labelCls}>
                    Shop Name <span className="normal-case font-normal text-gray-300">({form.shopName.length}/{LIMITS.shopName})</span>
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input name="shopName" value={form.shopName} onChange={handleChange} maxLength={LIMITS.shopName}
                      placeholder="Amar Ice Cream Wholesale" required autoComplete="organization" disabled={loading}
                      className={inputCls()} style={{ paddingLeft: "36px" }} />
                  </div>
                </div>

                {/* GSTIN */}
                <div>
                  <label className={labelCls}>
                    GSTIN <span className="normal-case font-normal text-gray-300">({form.gstin.length}/{LIMITS.gstin})</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input name="gstin" value={form.gstin} onChange={handleGSTINChange} maxLength={LIMITS.gstin}
                      placeholder="27ABCDE1234F1Z5" required autoComplete="off" spellCheck={false} disabled={loading}
                      className={inputCls(!!gstinError)} style={{ paddingLeft: "36px", fontFamily: "monospace" }} />
                  </div>
                  {gstinError && <p className="mt-1 text-xs text-red-500" role="alert">{gstinError}</p>}
                </div>

                {/* SHOP ADDRESS */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    Shop Address <span className="normal-case font-normal text-gray-300">({form.shopAddress.length}/{LIMITS.shopAddress})</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 text-gray-400" size={15} />
                    <textarea name="shopAddress" value={form.shopAddress} onChange={handleChange}
                      maxLength={LIMITS.shopAddress} placeholder="Street, Area, City, Pincode" rows={2}
                      required autoComplete="street-address" disabled={loading}
                      className={`${inputCls()} resize-none`} style={{ paddingLeft: "36px" }} />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <label className={labelCls}>
                    Password <span className="normal-case font-normal text-gray-300">({form.password.length}/{LIMITS.password})</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input name="password" type={showPwd ? "text" : "password"} value={form.password}
                      onChange={handleChange} maxLength={LIMITS.password} placeholder="Min. 6 characters"
                      required autoComplete="new-password" disabled={loading}
                      className={inputCls()} style={{ paddingLeft: "36px", paddingRight: "40px" }} />
                    <button type="button" onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                      aria-label={showPwd ? "Hide password" : "Show password"}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label className={labelCls}>Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input name="confirmPassword" type={showConfirmPwd ? "text" : "password"}
                      value={form.confirmPassword} onChange={handleChange} maxLength={LIMITS.password}
                      placeholder="Re-enter password" required autoComplete="new-password"
                      onPaste={preventPaste} disabled={loading}
                      className={inputCls(!!form.confirmPassword && form.password !== form.confirmPassword)}
                      style={{ paddingLeft: "36px", paddingRight: "40px" }} />
                    <button type="button" onClick={() => setShowConfirmPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                      aria-label={showConfirmPwd ? "Hide password" : "Show password"}>
                      {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500" role="alert">Passwords do not match.</p>
                  )}
                </div>
              </div>

              {/* SUBMIT */}
              <div className="pt-2">
                <button type="submit" disabled={loading || !!gstinError}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors">
                  {loading ? <><Loader2 className="animate-spin" size={16} />Creating account…</> : "Create account"}
                </button>
              </div>

            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            By registering, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="light" autoClose={3000} />
    </div>
  );
}