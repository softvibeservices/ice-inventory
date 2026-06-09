// src/app/dashboard/billing/BillingHeader.tsx
"use client";

import type { SellerDetails } from "./billing.types";

type Props = {
  seller: SellerDetails | null;
};

export default function BillingHeader({ seller }: Props) {
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {seller?.logoUrl ? (
              <img
                src={seller.logoUrl}
                alt="logo"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                No Logo
              </div>
            )}
          </div>
          <div className="flex-1 text-right text-sm sm:text-base">
            <h2 className="text-lg sm:text-xl font-bold text-gray-700">
              {seller?.sellerName || "Seller Name"}
            </h2>
            {seller?.contact && (
              <p className="text-gray-700"> {seller.contact}</p>
            )}
            <p className="text-gray-700">{seller?.fullAddress || "-"}</p>
            <p className="text-gray-800">GST: {seller?.gstNumber || "-"}</p>
            {seller?.compositionLine && (
              <div className="mt-1">
                <p className="text-gray-500 text-right text-xs sm:text-sm italic">
                  {seller.compositionLine}
                </p>
              </div>
            )}
          </div>
        </div>
        {seller?.slogan && (
          <p className="text-gray-700 text-center text-xs sm:text-sm font-medium mt-3">
            {seller.slogan}
          </p>
        )}
      </div>
    </header>
  );
}   