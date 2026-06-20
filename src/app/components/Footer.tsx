// src/app/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">IS</span>
              </div>
              <span className="font-bold text-gray-900 text-[17px]">IceSaathi</span>
            </Link>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              The best inventory management and billing software for ice cream wholesalers, distributors and shop owners in India.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>
                Support:{" "}
                <a
                  href="mailto:softvibeservices@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  softvibeservices@gmail.com
                </a>
              </p>
              <p>
                Built by:{" "}
                <a
                  href="https://softvibe-service.vercel.app/"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SoftVibe Services
                </a>
              </p>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">
              Product
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/#features" className="hover:text-gray-900 transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-gray-900 transition-colors">How it Works</Link></li>
              <li><Link href="/#faq" className="hover:text-gray-900 transition-colors">FAQ</Link></li>
              <li><Link href="/register" className="hover:text-gray-900 transition-colors">Start Free Trial</Link></li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">
              Features
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/#gst-billing" className="hover:text-gray-900 transition-colors">GST Billing & Invoices</Link></li>
              <li><Link href="/#stock-management" className="hover:text-gray-900 transition-colors">Stock Management</Link></li>
              <li><Link href="/#customer-ledger" className="hover:text-gray-900 transition-colors">Customer Ledger</Link></li>
              <li><Link href="/#live-gps-tracking" className="hover:text-gray-900 transition-colors">Live GPS Tracking</Link></li>
              <li><Link href="/#sales-analytics" className="hover:text-gray-900 transition-colors">Sales Analytics</Link></li>
              <li><Link href="/#delivery-partner-management" className="hover:text-gray-900 transition-colors">Delivery Management</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">
              Account
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/register" className="hover:text-gray-900 transition-colors">Create Account</Link></li>
              <li><Link href="/login" className="hover:text-gray-900 transition-colors">Login</Link></li>
              <li><Link href="/forgot-password" className="hover:text-gray-900 transition-colors">Forgot Password</Link></li>
              <li>
                <a
                  href="mailto:softvibeservices@gmail.com"
                  className="hover:text-gray-900 transition-colors"
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <Link href="/terms" className="hover:text-gray-900 transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-gray-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-gray-900 transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} IceSaathi by{" "}
            <a
              href="https://softvibe-service.vercel.app/"
              className="hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              SoftVibe Services
            </a>
            . All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/refund" className="hover:text-gray-900 transition-colors">Refund</Link>
          </div>
          <p className="text-sm text-gray-500">
            India&apos;s Best Software for Ice Cream Business
          </p>
        </div>
      </div>
    </footer>
  );
}