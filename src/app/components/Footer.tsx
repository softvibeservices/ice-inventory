// icecream-inventory/src/app/components/Footer.tsx

export default function Footer() {
  return (
    <footer className="relative w-full mt-auto">
      {/* Top icy glow line */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

      <div
        className="
          bg-gradient-to-br
          from-[#020617]
          via-[#020b2c]
          to-[#031136]
          backdrop-blur-xl
          border-t border-white/10
          py-8
        "
      >
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-slate-300">
          <p className="leading-relaxed">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-white">
              IceCream Inventory
            </span>{" "}
            • Developed by{" "}
            <span className="font-semibold text-cyan-400">
              Nitrajsinh Solanki
            </span>{" "}
            &{" "}
            <span className="font-semibold text-cyan-400">
              Amar Tiwari
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
