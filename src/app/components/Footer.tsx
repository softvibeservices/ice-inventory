// icecream-inventory/src/app/components/Footer.tsx

export default function Footer() {
  return (
    <footer className="w-full bg-gray-900 text-white py-3 border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-6 flex justify-center items-center text-sm">
        <span>© {new Date().getFullYear()} IceCream Inventory • Developed by </span>
        <span className="font-semibold mx-1">Nitrajsinh Solanki</span> &{" "}
        <span className="font-semibold ml-1">Amar Tiwari</span>
      </div>
    </footer>
  );
}
