// ice-inventory/src/app/dashboard/profile/delivery-partners/page.tsx

"use client";

import { Suspense } from "react";
import DeliveryPartnersPage from "./DeliveryPartnersPage";

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-600">Loading delivery partners...</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DeliveryPartnersPage />
    </Suspense>
  );
}