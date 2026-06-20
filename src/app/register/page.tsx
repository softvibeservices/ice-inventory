"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { User, Mail, Lock, Eye, EyeOff, Phone, Loader2 } from "lucide-react";

const LIMITS = {
  name: 80,
  email: 254,
  contact: 10,
  password: 128,
} as const;

interface FormState {
  name: string;
  email: string;
  contact: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const submittingRef = useRef(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const limit = LIMITS[name as keyof typeof LIMITS];
    setForm((prev) => ({
      ...prev,
      [name]: limit ? value.slice(0, limit) : value,
    }));
  }, []);

  const handleContactChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, LIMITS.contact);
    setForm((prev) => ({ ...prev, contact: digits }));
  }, []);

  const preventPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.info("Please type your password to confirm it.");
  }, []);

  const validate = (): boolean => {
    const { name, email, contact, password, confirmPassword } = form;

    if (!name || !email || !contact || !password || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return false;
    }

    if (!/^[0-9]{10}$/.test(contact)) {
      toast.error("Enter a valid 10-digit contact number.");
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
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          contact: form.contact,
          password: form.password,
          termsAccepted,
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
      router.replace(
        `/verify-otp?email=${encodeURIComponent(form.email.trim().toLowerCase())}`
      );
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const inputCls = (hasError?: boolean) =>
    `w-full rounded-xl border ${
      hasError ? "border-red-400" : "border-gray-200"
    } bg-white px-4 py-3.5 text-[15px] text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 disabled:bg-gray-50`;

  const labelCls =
    "mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-md sm:max-w-lg">
          {/* Header */}
          <div className="mb-6 text-center sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Create your account
            </h1>
            <p className="mt-2 text-sm sm:text-[15px] text-gray-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            {/* Honeypot */}
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

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
              {/* FULL NAME */}
              <div>
                <label className={labelCls}>
                  Full Name{" "}
                  <span className="normal-case font-normal text-gray-300">
                    ({form.name.length}/{LIMITS.name})
                  </span>
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    size={17}
                  />
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    maxLength={LIMITS.name}
                    placeholder="Enter your full name"
                    required
                    autoComplete="name"
                    disabled={loading}
                    className={inputCls()}
                    style={{ paddingLeft: "42px" }}
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className={labelCls}>
                  Email{" "}
                  <span className="normal-case font-normal text-gray-300">
                    ({form.email.length}/{LIMITS.email})
                  </span>
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    size={17}
                  />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    maxLength={LIMITS.email}
                    placeholder="Enter your email address"
                    required
                    autoComplete="email"
                    disabled={loading}
                    className={inputCls()}
                    style={{ paddingLeft: "42px" }}
                  />
                </div>
              </div>

              {/* CONTACT */}
              <div>
                <label className={labelCls}>
                  Contact Number{" "}
                  <span className="normal-case font-normal text-gray-300">
                    ({form.contact.length}/{LIMITS.contact})
                  </span>
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    size={17}
                  />
                  <input
                    name="contact"
                    type="tel"
                    value={form.contact}
                    onChange={handleContactChange}
                    maxLength={LIMITS.contact}
                    placeholder="Enter 10-digit mobile number"
                    required
                    autoComplete="tel"
                    inputMode="numeric"
                    disabled={loading}
                    className={inputCls()}
                    style={{ paddingLeft: "42px" }}
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className={labelCls}>
                  Password{" "}
                  <span className="normal-case font-normal text-gray-300">
                    ({form.password.length}/{LIMITS.password})
                  </span>
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    size={17}
                  />
                  <input
                    name="password"
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    maxLength={LIMITS.password}
                    placeholder="Create a password"
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    className={inputCls()}
                    style={{ paddingLeft: "42px", paddingRight: "42px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label className={labelCls}>Confirm Password</label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    size={17}
                  />
                  <input
                    name="confirmPassword"
                    type={showConfirmPwd ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    maxLength={LIMITS.password}
                    placeholder="Re-enter your password"
                    required
                    autoComplete="new-password"
                    onPaste={preventPaste}
                    disabled={loading}
                    className={inputCls(
                      !!form.confirmPassword &&
                        form.password !== form.confirmPassword
                    )}
                    style={{ paddingLeft: "42px", paddingRight: "42px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showConfirmPwd ? "Hide password" : "Show password"}
                  >
                    {showConfirmPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-500" role="alert">
                    Passwords do not match.
                  </p>
                )}
              </div>

              {/* ── Terms & Conditions checkbox ── */}
              <div className="flex items-start gap-3 py-1">
                <input
                  type="checkbox"
                  id="terms-accept-register"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0"
                  style={{ accentColor: "#2563eb" }}
                />
                <label htmlFor="terms-accept-register" className="text-sm text-gray-600 leading-snug cursor-pointer select-none">
                  I have read and accept the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms &amp; Conditions
                  </a>
                  ,{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a
                    href="/refund"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Refund Policy
                  </a>{" "}
                  of IceSaathi. By creating an account, I agree to be bound by these policies.
                </label>
              </div>

              {/* SUBMIT */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading || !termsAccepted}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={17} />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>
              </div>
            </form>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-gray-400">
            By registering, you agree to our Terms &amp; Conditions, Privacy Policy and Refund Policy.
          </p>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="light" autoClose={3000} />
    </div>
  );
}