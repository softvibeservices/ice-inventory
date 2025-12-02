// icecream-inventory/src/app/register/page.tsx
"use client";

import { useState } from "react";
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

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    shopName: "",
    shopAddress: "",
    gstin: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [gstinError, setGstinError] = useState<string>("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, contact: digitsOnly }));
  };

  const handleGSTINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value || "";
    const value = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setForm((prev) => ({ ...prev, gstin: value }));

    if (!value) {
      setGstinError("GSTIN is required");
    } else if (value.length !== 15) {
      setGstinError("GSTIN must be exactly 15 characters");
    } else if (!GSTIN_REGEX.test(value)) {
      setGstinError("Enter a valid GSTIN (e.g., 27ABCDE1234F1Z5)");
    } else {
      setGstinError("");
    }
  };

  const validate = () => {
    const {
      name,
      email,
      contact,
      shopName,
      shopAddress,
      gstin,
      password,
      confirmPassword,
    } = form;

    if (
      !name ||
      !email ||
      !contact ||
      !shopName ||
      !shopAddress ||
      !gstin ||
      !password ||
      !confirmPassword
    ) {
      toast.error("Please fill in all fields.");
      return false;
    }

    if (!/^[0-9]{10}$/.test(contact)) {
      toast.error("Enter a valid 10-digit contact number.");
      return false;
    }

    if (!GSTIN_REGEX.test(gstin)) {
      setGstinError("Enter a valid GSTIN (e.g., 27ABCDE1234F1Z5)");
      toast.error("Invalid GSTIN format.");
      return false;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return false;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          contact: form.contact, // ✅ send contact to API
          shopName: form.shopName,
          shopAddress: form.shopAddress,
          gstin: form.gstin,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Registration failed!");
        setLoading(false);
        return;
      }

      toast.success("OTP sent to your email!");
      router.replace(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex flex-col md:flex-row">
            {/* Left panel */}
            <aside className="hidden w-full md:block md:w-2/5">
              <div className="flex h-full flex-col justify-center bg-gradient-to-b from-blue-600 to-indigo-600 p-10 text-white">
                <h2 className="mb-4 text-3xl font-extrabold">
                  Create your account
                </h2>
                <p className="mb-6 text-white/90">
                  One place to manage inventory, expiry alerts, and reports —
                  built for ice cream wholesalers.
                </p>
                <ul className="space-y-3 text-white/95">
                  <li className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      ✓
                    </span>
                    Real-time stock tracking
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      ✓
                    </span>
                    Automatic expiry notifications
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      ✓
                    </span>
                    Clean reports and analytics
                  </li>
                </ul>
              </div>
            </aside>

            {/* Right panel / form */}
            <section className="w-full md:w-3/5">
              <div className="flex h-full max-h-[80vh] flex-col justify-center overflow-y-auto p-6 sm:p-8">
                <div className="mb-6 text-center">
                  <h3 className="text-2xl font-bold text-blue-700 sm:text-3xl">
                    Sign up
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 sm:text-base">
                    It takes less than a minute.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Name */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <div className="relative">
                        <User
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          name="name"
                          onChange={handleChange}
                          placeholder="e.g., Nitrajsinh Solanki"
                          autoComplete="name"
                          required
                          className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-3 text-base text-gray-900 placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          name="email"
                          type="email"
                          onChange={handleChange}
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                          className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-3 text-base text-gray-900 placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>

                    {/* Contact */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Contact Number
                      </label>
                      <div className="relative">
                        <Phone
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          name="contact"
                          type="tel"
                          inputMode="numeric"
                          value={form.contact}
                          onChange={handleContactChange}
                          placeholder="10-digit mobile number"
                          pattern="[0-9]{10}"
                          required
                          className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-3 text-base text-gray-900 placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>

                    {/* Shop Name */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Shop Name
                      </label>
                      <div className="relative">
                        <Store
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          name="shopName"
                          onChange={handleChange}
                          placeholder="e.g., Amar Ice Cream Wholesale"
                          required
                          className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-3 text-base text-gray-900 placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>

                    {/* GSTIN */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        GSTIN
                      </label>
                      <div className="relative">
                        <FileText
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          name="gstin"
                          value={form.gstin}
                          onChange={handleGSTINChange}
                          placeholder="e.g., 27ABCDE1234F1Z5"
                          minLength={15}
                          maxLength={15}
                          required
                          aria-invalid={!!gstinError}
                          className={`w-full rounded-md border ${
                            gstinError ? "border-red-500" : "border-gray-300"
                          } py-3 pl-10 pr-3 text-base text-gray-900 placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-400`}
                        />
                      </div>
                      {gstinError && (
                        <p className="mt-1 text-sm text-red-500">{gstinError}</p>
                      )}
                    </div>

                    {/* Shop Address */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Shop Address
                      </label>
                      <div className="relative">
                        <MapPin
                          className="pointer-events-none absolute left-3 top-3 text-gray-400"
                          size={18}
                        />
                        <textarea
                          name="shopAddress"
                          onChange={handleChange}
                          placeholder="Street, Area, City, Pincode"
                          rows={2}
                          required
                          className="w-full resize-none rounded-md border border-gray-300 py-3 pl-10 pr-3 text-base text-gray-900 placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          name="password"
                          type={showPwd ? "text" : "password"}
                          onChange={handleChange}
                          placeholder="Minimum 6 characters"
                          autoComplete="new-password"
                          minLength={6}
                          required
                          className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-10 text-base text-gray-900 placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          aria-label={showPwd ? "Hide password" : "Show password"}
                        >
                          {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          name="confirmPassword"
                          type={showConfirmPwd ? "text" : "password"}
                          onChange={handleChange}
                          placeholder="Re-enter password"
                          autoComplete="new-password"
                          minLength={6}
                          required
                          className="w-full rounded-md border border-gray-300 py-3 pl-10 pr-10 text-base text-gray-900 placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPwd((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          aria-label={
                            showConfirmPwd ? "Hide confirm password" : "Show confirm password"
                          }
                        >
                          {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full rounded-md py-3 font-semibold text-white transition ${
                      loading
                        ? "cursor-not-allowed bg-blue-400"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {loading ? "Sending OTP..." : "Register"}
                  </button>

                  <p className="text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="font-semibold text-blue-600 hover:underline"
                    >
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
      <ToastContainer position="top-right" closeOnClick theme="light" />
    </div>
  );
}
