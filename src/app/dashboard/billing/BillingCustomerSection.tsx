// src/app/dashboard/billing/BillingCustomerSection.tsx
"use client";

import { useRef } from "react";
import type { Customer } from "./billing.types";

type Props = {
  // Billing
  billingCustomer: Customer | null;
  customerInput: string;
  showCustomerSuggestions: boolean;
  filteredCustomers: Customer[];
  customerSuggestionIndex: number;
  billingInputRef: React.RefObject<HTMLInputElement | null>;

  // Shipping
  shippingCustomer: Customer | null;
  shippingInput: string;
  showShippingSuggestions: boolean;
  filteredShippingCustomers: Customer[];
  shippingSuggestionIndex: number;
  shippingInputRef: React.RefObject<HTMLInputElement | null>;
  sameAsBilling: boolean;

  // Callbacks
  onCustomerInputChange: (val: string) => void;
  onShippingInputChange: (val: string) => void;
  onBillingCustomerSelect: (c: Customer) => void;
  onShippingCustomerSelect: (c: Customer) => void;
  onSameAsBillingChange: (checked: boolean) => void;
  onClearBilling: () => void;
  onClearShipping: () => void;
  onCustomerKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onShippingKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBillingFocus: () => void;
  onShippingFocus: () => void;
  onBillingBlur: () => void;
  onShippingBlur: () => void;
};

export default function BillingCustomerSection({
  billingCustomer,
  customerInput,
  showCustomerSuggestions,
  filteredCustomers,
  customerSuggestionIndex,
  billingInputRef,

  shippingCustomer,
  shippingInput,
  showShippingSuggestions,
  filteredShippingCustomers,
  shippingSuggestionIndex,
  shippingInputRef,
  sameAsBilling,

  onCustomerInputChange,
  onShippingInputChange,
  onBillingCustomerSelect,
  onShippingCustomerSelect,
  onSameAsBillingChange,
  onClearBilling,
  onClearShipping,
  onCustomerKeyDown,
  onShippingKeyDown,
  onBillingFocus,
  onShippingFocus,
  onBillingBlur,
  onShippingBlur,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4">
      {/* ── BILLING DETAILS ─────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Billing Details</h3>
        <div className="flex gap-2">
          <input
            ref={billingInputRef}
            suppressHydrationWarning
            value={customerInput}
            onChange={(e) => onCustomerInputChange(e.target.value)}
            onFocus={onBillingFocus}
            onBlur={onBillingBlur}
            onKeyDown={onCustomerKeyDown}
            placeholder="Type shop name..."
            className="w-full border p-2 rounded text-xs sm:text-sm text-gray-900"
          />
          <button
            onClick={onClearBilling}
            className="px-2 sm:px-3 py-1 sm:py-2 bg-gray-200 rounded text-xs sm:text-sm"
          >
            Clear
          </button>
        </div>

        {/* Billing suggestions dropdown */}
        {showCustomerSuggestions && filteredCustomers.length > 0 && (
          <div className="relative">
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredCustomers.map((c, i) => {
                const label =
                  c.shopName && c.name
                    ? `${c.shopName} - ${c.name}`
                    : c.shopName || c.name;
                return (
                  <div
                    key={c._id}
                    onMouseDown={() => onBillingCustomerSelect(c)}
                    className={`px-3 py-2 cursor-pointer text-sm ${
                      customerSuggestionIndex === i
                        ? "bg-blue-600 text-white"
                        : "hover:bg-blue-50"
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-2 text-xs sm:text-sm text-gray-800">
          <div>
            <strong>Shop Name:</strong> {billingCustomer?.shopName || "-"}
          </div>
          <div>
            <strong>Customer Name:</strong> {billingCustomer?.name || "-"}
          </div>
          <div>
            <strong>Contact:</strong> {billingCustomer?.contact || "-"}
          </div>
          <div>
            <strong>Address:</strong>{" "}
            {billingCustomer?.address || billingCustomer?.shopAddress || "-"}
          </div>
        </div>
      </div>

      {/* ── SHIPPING DETAILS ────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Shipping Details</h3>
        <label className="flex items-center gap-2 text-xs sm:text-sm mb-2">
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(e) => onSameAsBillingChange(e.target.checked)}
          />
          Same as Billing
        </label>

        {!sameAsBilling && (
          <>
            <div className="flex gap-2">
              <input
                ref={shippingInputRef}
                suppressHydrationWarning
                value={shippingInput}
                onChange={(e) => onShippingInputChange(e.target.value)}
                onFocus={onShippingFocus}
                onBlur={onShippingBlur}
                onKeyDown={onShippingKeyDown}
                placeholder="Type shop name..."
                className="w-full border p-2 rounded text-xs sm:text-sm text-gray-900"
              />
              <button
                onClick={onClearShipping}
                className="px-2 sm:px-3 py-1 sm:py-2 bg-gray-200 rounded text-xs sm:text-sm"
              >
                Clear
              </button>
            </div>

            {/* Shipping suggestions dropdown */}
            {showShippingSuggestions && filteredShippingCustomers.length > 0 && (
              <div className="relative">
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredShippingCustomers.map((c, i) => {
                    const label =
                      c.shopName && c.name
                        ? `${c.shopName} - ${c.name}`
                        : c.shopName || c.name;
                    return (
                      <div
                        key={c._id}
                        onMouseDown={() => onShippingCustomerSelect(c)}
                        className={`px-3 py-2 cursor-pointer text-sm ${
                          shippingSuggestionIndex === i
                            ? "bg-blue-600 text-white"
                            : "hover:bg-blue-50"
                        }`}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-2 text-xs sm:text-sm text-gray-800">
          <div>
            <strong>Shop Name:</strong>{" "}
            {sameAsBilling
              ? billingCustomer?.shopName || "-"
              : shippingCustomer?.shopName || "-"}
          </div>
          <div>
            <strong>Customer Name:</strong>{" "}
            {sameAsBilling
              ? billingCustomer?.name || "-"
              : shippingCustomer?.name || "-"}
          </div>
          <div>
            <strong>Contact:</strong>{" "}
            {sameAsBilling
              ? billingCustomer?.contact || "-"
              : shippingCustomer?.contact || "-"}
          </div>
          <div>
            <strong>Address:</strong>{" "}
            {sameAsBilling
              ? billingCustomer?.address || billingCustomer?.shopAddress || "-"
              : shippingCustomer?.address || shippingCustomer?.shopAddress || "-"}
          </div>
        </div>
      </div>
    </div>
  );
}