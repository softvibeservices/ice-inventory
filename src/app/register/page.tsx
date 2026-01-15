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

  /* ================= LOGIC UNCHANGED ================= */

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
          contact: form.contact,
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

  /* ================= UI FIX ONLY ================= */

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
                  <h3 className="text-2xl sm:text-3xl font-bold text-cyan-400">
                    Sign up
                  </h3>
                  <p className="mt-1 text-sm sm:text-base text-slate-300">
                    It takes less than a minute.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    {/* FULL NAME */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          name="name"
                          onChange={handleChange}
                          placeholder="e.g., Nitrajsinh Solanki"
                          required
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* EMAIL */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          name="email"
                          type="email"
                          onChange={handleChange}
                          placeholder="you@example.com"
                          required
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* CONTACT */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Contact Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          name="contact"
                          value={form.contact}
                          onChange={handleContactChange}
                          placeholder="10-digit mobile number"
                          required
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* SHOP NAME */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Shop Name
                      </label>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          name="shopName"
                          onChange={handleChange}
                          placeholder="e.g., Amar Ice Cream Wholesale"
                          required
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* GSTIN */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        GSTIN
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          name="gstin"
                          value={form.gstin}
                          onChange={handleGSTINChange}
                          placeholder="e.g., 27ABCDE1234F1Z5"
                          required
                          className={`w-full rounded-md bg-white/10 border ${
                            gstinError ? "border-red-500" : "border-white/20"
                          } py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400`}
                        />
                      </div>
                      {gstinError && (
                        <p className="mt-1 text-sm text-red-400">{gstinError}</p>
                      )}
                    </div>

                    {/* SHOP ADDRESS */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm text-slate-300">
                        Shop Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                        <textarea
                          name="shopAddress"
                          onChange={handleChange}
                          placeholder="Street, Area, City, Pincode"
                          rows={2}
                          required
                          className="w-full resize-none rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* PASSWORD */}
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          name="password"
                          type={showPwd ? "text" : "password"}
                          onChange={handleChange}
                          placeholder="Minimum 6 characters"
                          required
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-10 text-white outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          name="confirmPassword"
                          type={showConfirmPwd ? "text" : "password"}
                          onChange={handleChange}
                          placeholder="Re-enter password"
                          required
                          className="w-full rounded-md bg-white/10 border border-white/20 py-3 pl-10 pr-10 text-white outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPwd((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md py-3 font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition"
                  >
                    {loading ? "Sending OTP..." : "Register"}
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
