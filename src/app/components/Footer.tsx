// src/app/components/Footer.tsx

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-sm">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-white">Ice Saathi</span>
            {" "}• Developed by{" "}
            <span className="font-semibold text-blue-400">Nitrajsinh Solanki</span>
            {" "}&{" "}
            <span className="font-semibold text-blue-400">Amar Tiwari</span>
          </p>
        </div>
      </div>
    </footer>
  );
}