// icecream-inventory\src\app\page.tsx



"use client";

import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import {
  FaSnowflake,
  FaBoxOpen,
  FaUsers,
  FaWarehouse,
  FaFileInvoice,
  FaShoppingCart,
  FaChartLine,
  FaUserShield,
  FaMotorcycle,
  FaMapMarkedAlt,
  FaPlusCircle,
} from "react-icons/fa";
import { useRouter } from "next/navigation";

/* ---------- TYPES ---------- */
type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  char: string;
};

export default function Home() {
  const router = useRouter();
  const [particles, setParticles] = useState<Particle[]>([]);

  /* ---------- LIGHT PARTICLES (PERF SAFE) ---------- */
  useEffect(() => {
    const list: Particle[] = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 6 + Math.random() * 10,
      opacity: 0.2 + Math.random() * 0.4,
      duration: 12 + Math.random() * 10,
      char: Math.random() > 0.5 ? "❄" : "•",
    }));
    setParticles(list);
  }, []);

  /* ---------- ANIMATIONS ---------- */
  const particleAnim = (d: number): Variants => ({
    animate: {
      y: [0, -40, 0],
      transition: { duration: d, repeat: Infinity, ease: "linear" },
    },
  });

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0 },
  };

  const cardHover: Variants = {
    hover: {
      y: -8,
      transition: { duration: 0.25, ease: "easeOut" },
    },
  };

  const logoHover: Variants = {
    hover: {
      scale: 1.05,
      transition: { duration: 0.25, ease: "easeOut" },
    },
  };

  const buttonHover: Variants = {
    hover: {
      scale: 1.06,
      boxShadow: "0 0 30px rgba(56,189,248,0.8)",
      transition: { duration: 0.25 },
    },
    tap: { scale: 0.96 },
  };

  const features = [
    { icon: <FaBoxOpen />, title: "Product Management", desc: "Products, categories & pricing." },
    { icon: <FaUsers />, title: "Customer Management", desc: "Customers & shop records." },
    { icon: <FaWarehouse />, title: "Stock Management", desc: "Live stock & expiry tracking." },
    { icon: <FaFileInvoice />, title: "Bill Generation", desc: "GST billing & invoices." },
    { icon: <FaShoppingCart />, title: "Orders Management", desc: "Order lifecycle control." },
    { icon: <FaChartLine />, title: "Sales Analysis", desc: "Business performance insights." },
    { icon: <FaUserShield />, title: "Manager Role Facility", desc: "Permission-based access." },
    { icon: <FaMotorcycle />, title: "Delivery Partner App", desc: "Dedicated delivery app." },
    { icon: <FaMapMarkedAlt />, title: "Live Delivery Tracking", desc: "Real-time location view." },
  ];

  return (
    <div className="relative min-h-screen bg-[#050b18] text-white overflow-x-hidden">
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#020b2c] to-[#031136]" />

      {/* PARTICLES */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            variants={particleAnim(p.duration)}
            animate="animate"
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: `${p.size}px`,
              opacity: p.opacity,
              color: "#9be7ff",
            }}
          >
            {p.char}
          </motion.div>
        ))}
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        {/* HERO */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-10 items-center"
        >
          {/* LOGO — LEFT MOST */}
          <motion.div
            variants={logoHover}
            whileHover="hover"
            className="flex justify-start"
          >
            <Image
              src="/logo.png"
              alt="Ice Cream Logo"
              width={140}
              height={140}
              className="rounded-xl shadow-lg"
            />
          </motion.div>

          {/* TEXT — CENTER */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold">
              <FaSnowflake className="inline mr-2 text-cyan-400" />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                IceCream Inventory System
              </span>
            </h1>

            <p className="mt-4 text-base text-slate-300 max-w-2xl mx-auto">
              Complete inventory, billing, delivery & analytics platform designed
              for ice cream wholesalers.
            </p>

            <motion.button
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
              onClick={() => router.push("/login")}
              className="mt-6 px-7 py-3 rounded-full font-semibold
                         bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Get Started
            </motion.button>
          </div>
        </motion.section>

        {/* FEATURES — 4 PER ROW */}
        <section className="max-w-7xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={cardHover}
                whileHover="hover"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="bg-white/5 rounded-xl p-6 border border-white/10
                           hover:border-cyan-400/40 transition-colors"
              >
                <div className="text-3xl text-cyan-400 mb-3">{f.icon}</div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="text-sm text-slate-300 mt-2">{f.desc}</p>
              </motion.div>
            ))}

            {/* EXTRA CARD — CENTERED ON 3RD ROW */}
            <motion.div
              variants={cardHover}
              whileHover="hover"
              onClick={() => router.push("/register")}
              className="
                cursor-pointer
                bg-gradient-to-br from-cyan-500/15 to-blue-600/15
                rounded-xl p-6 border border-cyan-400/30
                flex flex-col items-center justify-center text-center
                lg:col-span-2 lg:col-start-2
              "
            >
              <FaPlusCircle className="text-4xl text-cyan-400 mb-3" />
              <h3 className="text-lg font-semibold">And many more…</h3>
              <p className="text-sm text-slate-300 mt-2">
                Create account to explore all features
              </p>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}


