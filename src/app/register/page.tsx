// src/app/register/page.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  User,
  Mail,
  Store,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  FileText,
  Phone,
} from "lucide-react";

// ─── Field limits (must match lib/registerValidation.ts) ─────────────────────
const LIMITS = {
  name:        80,
  email:       254,
  contact:     10,
  shopName:    120,
  shopAddress: 500,
  gstin:       15,
  password:    128,
} as const;

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name:            string;
  email:           string;
  contact:         string;
  shopName:        string;
  shopAddress:     string;
  gstin:           string;
  password:        string;
  confirmPassword: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name:            "",
    email:           "",
    contact:         "",
    shopName:        "",
    shopAddress:     "",
    gstin:           "",
    password:        "",
    confirmPassword: "",
  });

  const [loading,        setLoading]        = useState(false);
  const [showPwd,        setShowPwd]        = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [gstinError,     setGstinError]     = useState("");

  /** Debounce guard — prevents double-submit on fast clicks */
  const submittingRef = useRef(false);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      const limit = LIMITS[name as keyof typeof LIMITS];
      setForm((prev) => ({
        ...prev,
        [name]: limit ? value.slice(0, limit) : value,
      }));
    },
    []
  );

  const handleContactChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, LIMITS.contact);
      setForm((prev) => ({ ...prev, contact: digits }));
    },
    []
  );

  const handleGSTINChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, LIMITS.gstin);

      setForm((prev) => ({ ...prev, gstin: value }));

      if (!value) {
        setGstinError("GSTIN is required.");
      } else if (value.length !== 15) {
        setGstinError("GSTIN must be exactly 15 characters.");
      } else if (!GSTIN_REGEX.test(value)) {
        setGstinError("Enter a valid GSTIN (e.g., 27ABCDE1234F1Z5).");
      } else {
        setGstinError("");
      }
    },
    []
  );

  // Prevent pasting into confirm-password to force manual re-entry
  const preventPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.info("Please type your password to confirm it.");
  }, []);

  // ─── Validation ─────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const { name, email, contact, shopName, shopAddress, gstin, password, confirmPassword } = form;

    if (!name || !email || !contact || !shopName || !shopAddress || !gstin || !password || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return false;
    }

    if (!/^[0-9]{10}$/.test(contact)) {
      toast.error("Enter a valid 10-digit contact number.");
      return false;
    }

    if (!GSTIN_REGEX.test(gstin)) {
      toast.error("Invalid GSTIN format.");
      return false;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return false;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return false;
    }

    if (gstinError) {
      toast.error(gstinError);
      return false;
    }

    return true;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Debounce guard — ignore if already in-flight
    if (submittingRef.current || loading) return;
    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        form.name.trim(),
          email:       form.email.trim().toLowerCase(),
          contact:     form.contact,
          shopName:    form.shopName.trim(),
          shopAddress: form.shopAddress.trim(),
          gstin:       form.gstin,
          password:    form.password,
          // Honeypot field — always empty for real users
          _hp: "",
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        const wait = data?.retryAfterSeconds
          ? ` Please wait ${data.retryAfterSeconds} seconds.`
          : "";
        toast.error(`Too many attempts.${wait}`);
        return;
      }

      if (!res.ok) {
        toast.error(data?.error || "Registration failed. Please try again.");
        return;
      }

      toast.success("OTP sent to your email!");
      router.replace(`/verify-otp?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#020617] via-[#020b2c] to-[#031136] text-white">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-6xl rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex flex-col md:flex-row">

            {/* LEFT PANEL */}
            <aside className="hidden md:flex md:w-2/5">
              <div className="flex h-full flex-col justify-center p-10">
                <h2 className="mb-4 text-3xl font-extrabold text-cyan-400">
                  Create your account
                </h2>
                <p className="mb-6 text-slate-300">
                  One place to manage inventory, expiry alerts, and reports —
                  built for ice cream wholesalers.
                </p>
                <ul className="space-y-3 text-slate-300">
                  <li>✓ Real-time stock tracking</li>
                  <li>✓ Automatic expiry notifications</li>
                  <li>✓ Clean reports and analytics</li>
                </ul>
              </div>
            </aside>

            {/* FORM PANEL */}
            <section className="w-full md:w-3/5">
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <div className="mb-6 text-center">
                  <h3 className="text-2xl sm:text-3xl font-bold text-cyan-400">Sign up</h3>
                  <p className="mt-1 text-sm sm:text-base text-slate-300">
                    It takes less than a minute.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                  {/* ── Honeypot (hidden from real users, bots fill it) ── */}
                  <input
                    type="text"
                    name="_hp"
                    defaultValue=""
                    autoComplete="off"
                    tabIndex={-1}
                    aria-hidden="true"
                    style={{ display: "none" }}
                    readOnly
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    {/* FULL NAME */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Full Name
                        <span className="ml-1 text-xs text-slate-500">
                          ({form.name.length}/{LIMITS.name})
                        </span>
                      </label>
                      <div className="relative">
                        <User
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          maxLength={LIMITS.name}
                          placeholder="e.g., Nitrajsinh Solanki"
                          required
                          autoComplete="name"
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* EMAIL */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Email
                        <span className="ml-1 text-xs text-slate-500">
                          ({form.email.length}/{LIMITS.email})
                        </span>
                      </label>
                      <div className="relative">
                        <Mail
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          maxLength={LIMITS.email}
                          placeholder="you@example.com"
                          required
                          autoComplete="email"
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* CONTACT */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Contact Number
                        <span className="ml-1 text-xs text-slate-500">
                          ({form.contact.length}/{LIMITS.contact})
                        </span>
                      </label>
                      <div className="relative">
                        <Phone
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          name="contact"
                          type="tel"
                          value={form.contact}
                          onChange={handleContactChange}
                          maxLength={LIMITS.contact}
                          placeholder="10-digit mobile number"
                          required
                          autoComplete="tel"
                          inputMode="numeric"
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* SHOP NAME */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Shop Name
                        <span className="ml-1 text-xs text-slate-500">
                          ({form.shopName.length}/{LIMITS.shopName})
                        </span>
                      </label>
                      <div className="relative">
                        <Store
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          name="shopName"
                          value={form.shopName}
                          onChange={handleChange}
                          maxLength={LIMITS.shopName}
                          placeholder="e.g., Amar Ice Cream Wholesale"
                          required
                          autoComplete="organization"
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* GSTIN */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        GSTIN
                        <span className="ml-1 text-xs text-slate-500">
                          ({form.gstin.length}/{LIMITS.gstin})
                        </span>
                      </label>
                      <div className="relative">
                        <FileText
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          name="gstin"
                          value={form.gstin}
                          onChange={handleGSTINChange}
                          maxLength={LIMITS.gstin}
                          placeholder="e.g., 27ABCDE1234F1Z5"
                          required
                          autoComplete="off"
                          spellCheck={false}
                          className={`w-full rounded-md bg-white/10 border ${
                            gstinError ? "border-red-500" : "border-white/20"
                          } py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400`}
                        />
                      </div>
                      {gstinError && (
                        <p className="mt-1 text-sm text-red-400" role="alert">
                          {gstinError}
                        </p>
                      )}
                    </div>

                    {/* SHOP ADDRESS */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm text-slate-300">
                        Shop Address
                        <span className="ml-1 text-xs text-slate-500">
                          ({form.shopAddress.length}/{LIMITS.shopAddress})
                        </span>
                      </label>
                      <div className="relative">
                        <MapPin
                          className="absolute left-3 top-3 text-slate-400"
                          size={18}
                        />
                        <textarea
                          name="shopAddress"
                          value={form.shopAddress}
                          onChange={handleChange}
                          maxLength={LIMITS.shopAddress}
                          placeholder="Street, Area, City, Pincode"
                          rows={2}
                          required
                          autoComplete="street-address"
                          className="w-full resize-none rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* PASSWORD */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Password
                        <span className="ml-1 text-xs text-slate-500">
                          ({form.password.length}/{LIMITS.password})
                        </span>
                      </label>
                      <div className="relative">
                        <Lock
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          name="password"
                          type={showPwd ? "text" : "password"}
                          value={form.password}
                          onChange={handleChange}
                          maxLength={LIMITS.password}
                          placeholder="Minimum 6 characters"
                          required
                          autoComplete="new-password"
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-10 text-white outline-none focus:border-cyan-400"
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
                    </div>

                    {/* CONFIRM PASSWORD */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          name="confirmPassword"
                          type={showConfirmPwd ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={handleChange}
                          maxLength={LIMITS.password}
                          placeholder="Re-enter password"
                          required
                          autoComplete="new-password"
                          onPaste={preventPaste}
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-10 text-white outline-none focus:border-cyan-400"
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
                      {/* Live mismatch hint */}
                      {form.confirmPassword && form.password !== form.confirmPassword && (
                        <p className="mt-1 text-sm text-red-400" role="alert">
                          Passwords do not match.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* SUBMIT */}
                  <button
                    type="submit"
                    disabled={loading || !!gstinError}
                    className="w-full rounded-md py-3 font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending OTP…" : "Register"}
                  </button>

                  <p className="text-center text-sm text-slate-300">
                    Already have an account?{" "}
                    <Link href="/login" className="font-semibold text-cyan-400 hover:underline">
                      Login
                    </Link>
                  </p>
                </form>
              </div>
            </section>

          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="dark" />
    </div>
  );
}