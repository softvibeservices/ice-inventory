// src/app/dashboard/billing/BillingItemsTable.tsx
"use client";

import type { BillItem, Product, SellerDetails, BankDetails } from "./billing.types";

type Props = {
  items: BillItem[];
  products: Product[];
  discountPercent: number;
  remarks: string;
  serialNo: string;
  date: string;
  seller: SellerDetails | null;
  bank: BankDetails | null;

  // item-level callbacks
  onUpdateItem: (index: number, changes: Partial<BillItem>) => void;
  onToggleFree: (index: number, v: boolean) => void;
  onAddLine: () => void;
  onSortByUnit: () => void;
  onDiscountChange: (v: number) => void;
  onRemarksChange: (v: string) => void;

  // drag-reorder
  dragIndex: number | null;
  onDragStart: (idx: number) => void;
  onDrop: (idx: number) => void;

  // product suggestion
  activeProductRow: number | null;
  productSuggestionIndex: number[];
  onProductFocus: (idx: number) => void;
  onProductBlur: () => void;
  onProductChange: (idx: number, value: string) => void;
  onProductKeyDown: (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onProductSuggestionSelect: (idx: number, p: Product) => void;

  // qty
  onQtyChange: (idx: number, value: number) => void;
  onQtyFocus: (idx: number, e: React.FocusEvent<HTMLInputElement>) => void;
  onQtyKeyDown: (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => void;

  // price
  onPriceChange: (idx: number, value: number) => void;

  // refs (passed down so page keeps ref arrays)
  productRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  quantityRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;

  // helpers (pure, defined in page — passed down to avoid duplication)
  findProductByName: (name?: string | null) => Product | undefined;
  getProductStock: (p?: Product) => number | undefined;
  getFilteredProducts: (query: string) => Product[];
  fmt: (n: number) => string;

  // computed
  subTotal: number;
  totalQty: number;
  discounted: number;
};

export default function BillingItemsTable({
  items,
  discountPercent,
  remarks,
  serialNo,
  date,
  seller,
  bank,

  onUpdateItem,
  onToggleFree,
  onAddLine,
  onSortByUnit,
  onDiscountChange,
  onRemarksChange,

  dragIndex,
  onDragStart,
  onDrop,

  activeProductRow,
  productSuggestionIndex,
  onProductFocus,
  onProductBlur,
  onProductChange,
  onProductKeyDown,
  onProductSuggestionSelect,

  onQtyChange,
  onQtyFocus,
  onQtyKeyDown,
  onPriceChange,

  productRefs,
  quantityRefs,

  findProductByName,
  getProductStock,
  getFilteredProducts,
  fmt,

  subTotal,
  totalQty,
  discounted,
}: Props) {
  return (
    <>
      {/* ── SERIAL + DATE ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 text-xs sm:text-sm">
        <div>
          <strong>Serial No:</strong>{" "}
          {serialNo || (
            <span className="text-gray-400 italic">Loading...</span>
          )}
        </div>
        <div>
          <strong>Date:</strong> {date}
        </div>
      </div>

      {/* ── PRODUCT TABLE ─────────────────────────────────────── */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full table-auto border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1 sm:px-3 sm:py-2">#</th>
              <th className="border px-2 py-1 sm:px-3 sm:py-2">Product</th>
              <th className="border px-2 py-1 sm:px-3 sm:py-2">Qty</th>
              <th className="border px-2 py-1 sm:px-3 sm:py-2">Price</th>
              <th className="border px-2 py-1 sm:px-3 sm:py-2">Total</th>
              <th className="border px-2 py-1 sm:px-3 sm:py-2">Free</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const matched = findProductByName(it.productName);
              const stock = getProductStock(matched);
              const isLastRow = idx === items.length - 1;

              // canEditRow logic: allow editing up to & including first incomplete row
              const firstIncomplete = items.findIndex(
                (i) => !i.productName || i.quantity <= 0
              );
              const editable = firstIncomplete === -1 || idx <= firstIncomplete;

              return (
                <tr key={idx} className="even:bg-white odd:bg-gray-50">
                  {/* ── Drag handle + row number ── */}
                  <td
                    draggable={!!it.productName && it.quantity > 0}
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(idx)}
                    className="cursor-grab border px-1 py-0.5 sm:px-2 sm:py-1 text-center align-middle"
                  >
                    ≡ {idx + 1}
                  </td>

                  {/* ── Product name ── */}
                  <td className="border px-1 py-0.5 sm:px-2 sm:py-1 align-top relative">
                    <input
                      value={it.productName}
                      disabled={!editable}
                      ref={(el) => {
                        productRefs.current[idx] = el;
                      }}
                      onChange={(e) => onProductChange(idx, e.target.value)}
                      onFocus={() => onProductFocus(idx)}
                      onBlur={() => onProductBlur()}
                      onKeyDown={(e) => onProductKeyDown(idx, e)}
                      className="w-full border rounded px-1 py-0.5 sm:px-2 sm:py-1 text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="Start typing product..."
                    />
                    {it.productName && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Start typing product name to see suggestions
                      </div>
                    )}
                    {matched && typeof stock === "number" && (
                      <div className="mt-1 text-[10px] text-gray-500">
                        In stock:{" "}
                        <span className="font-semibold">{stock}</span>
                        {matched.packUnit && (
                          <>
                            {" "}
                            | Pack:{" "}
                            <span className="font-semibold">
                              {matched.packUnit}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Product suggestions dropdown */}
                    {activeProductRow === idx &&
                      it.productName &&
                      getFilteredProducts(it.productName).length > 0 && (
                        <div className="absolute z-30 mt-1 w-full bg-white border rounded-md shadow-lg max-h-56 overflow-auto">
                          {getFilteredProducts(it.productName).map((p, i) => (
                            <div
                              key={p._id}
                              onMouseDown={() =>
                                onProductSuggestionSelect(idx, p)
                              }
                              className={`px-2 py-1 sm:px-3 sm:py-2 cursor-pointer text-xs sm:text-sm flex justify-between ${
                                (productSuggestionIndex[idx] || 0) === i
                                  ? "bg-blue-600 text-white"
                                  : "hover:bg-blue-50"
                              }`}
                            >
                              <span>{p.name}</span>
                              <span className="text-xs opacity-70">
                                {p.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </td>

                  {/* ── Quantity ── */}
                  <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center align-top">
                    <div className="flex flex-col items-center">
                      <input
                        suppressHydrationWarning
                        type="number"
                        min={0}
                        step="any"
                        disabled={!editable}
                        ref={(el) => {
                          quantityRefs.current[idx] = el;
                        }}
                        value={it.quantity === 0 ? "" : it.quantity}
                        onChange={(e) =>
                          onQtyChange(idx, Number(e.target.value || 0))
                        }
                        onFocus={(e) => onQtyFocus(idx, e)}
                        onKeyDown={(e) => onQtyKeyDown(idx, e)}
                        className="w-16 sm:w-20 border rounded px-1 py-0.5 sm:px-2 sm:py-1 text-center text-xs sm:text-sm text-gray-900"
                        placeholder="0"
                      />
                      {matched && typeof stock === "number" && (
                        <span className="mt-1 text-[10px] text-gray-500 block">
                          In stock:{" "}
                          <span className="font-semibold">{stock}</span>
                          {matched.packUnit && (
                            <>
                              {" "}
                              | Pack:{" "}
                              <span className="font-semibold">
                                {matched.packUnit}
                              </span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* ── Price ── */}
                  <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center align-top">
                    {it.free ? (
                      <span className="font-semibold text-red-600 text-xs sm:text-sm">
                        FREE
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <input
                          suppressHydrationWarning
                          type="number"
                          min={0}
                          step="any"
                          disabled={!editable}
                          value={it.price || ""}
                          onChange={(e) =>
                            onPriceChange(idx, Number(e.target.value || 0))
                          }
                          className="w-16 sm:w-24 border rounded px-1 py-0.5 sm:px-2 sm:py-1 text-center text-xs sm:text-sm text-gray-900"
                        />
                        {it.unit ? (
                          <span className="text-[10px] sm:text-xs text-gray-600">
                            /{it.unit}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </td>

                  {/* ── Total ── */}
                  <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center align-top">
                    {it.free ? (
                      <span className="font-semibold text-red-600 text-xs sm:text-sm">
                        FREE
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm">
                        {fmt(it.total)}
                      </span>
                    )}
                  </td>

                  {/* ── Free checkbox ── */}
                  <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center align-top">
                    <input
                      type="checkbox"
                      disabled={!editable}
                      checked={it.free}
                      onChange={(e) => onToggleFree(idx, e.target.checked)}
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                    />
                  </td>
                </tr>
              );
            })}

            {/* ── Totals row ── */}
            <tr className="bg-gray-100 font-semibold text-xs sm:text-sm">
              <td
                className="border px-1 py-0.5 sm:px-2 sm:py-1 text-right"
                colSpan={2}
              >
                Total Boxes
              </td>
              <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center">
                {totalQty}
              </td>
              <td className="border px-1 py-0.5 sm:px-2 sm:py-1"></td>
              <td className="border px-1 py-0.5 sm:px-2 sm:py-1 text-center">
                {fmt(subTotal)}
              </td>
              <td className="border px-1 py-0.5 sm:px-2 sm:py-1"></td>
            </tr>
          </tbody>
        </table>

        <p className="mt-1 text-[10px] sm:text-[11px] text-gray-500">
          * Total Quantity counts only items whose unit is{" "}
          <span className="font-semibold">box/boxes</span>. Units like ml /
          litre / piece are not included.
        </p>

        {/* ── Table action buttons ── */}
        <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <button
            onClick={onAddLine}
            className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs sm:text-sm"
          >
            + Add Line
          </button>
          <button
            onClick={onSortByUnit}
            className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs sm:text-sm"
          >
            Sort by Unit
          </button>
          <p className="text-[10px] sm:text-xs text-gray-500">
            ✨ <strong>New:</strong> Press Enter after quantity on the last row
            to auto-add a new line. Selecting a product auto-fills price/unit.
            Quantity is limited to stock.
          </p>
        </div>
      </div>

      {/* ── DISCOUNT / TOTAL ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm font-medium">Discount (%)</label>
          <input
            suppressHydrationWarning
            type="number"
            min={0}
            max={100}
            step="any"
            value={discountPercent || ""}
            onChange={(e) => onDiscountChange(Number(e.target.value || 0))}
            className="w-20 sm:w-28 border rounded px-1 py-0.5 sm:px-2 sm:py-1 text-xs sm:text-sm text-gray-900"
          />
        </div>
        <div className="text-right text-xs sm:text-sm">
          <div>
            Subtotal: <strong>{fmt(subTotal)}</strong>
          </div>
          <div className="text-base sm:text-lg font-bold">
            Total after Discount: {fmt(discounted)}
          </div>
        </div>
      </div>

      {/* ── FOOTER: Payment & Banking ─────────────────────────── */}
      <div className="border-t pt-3 sm:pt-4">
        <h3 className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">
          Payment & Banking
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          {/* Bank details */}
          <div className="text-[10px] sm:text-xs">
            <div>
              <strong>Bank:</strong>{" "}
              {bank?.bankName || seller?.bankName || "-"}
            </div>
            <div>
              <strong>Branch:</strong>{" "}
              {bank?.branchName || seller?.branchName || "-"}
            </div>
            <div>
              <strong>Account No:</strong>{" "}
              {bank?.accountNumber ||
                (seller as any)?.accountNumber ||
                (seller as any)?.accountNo ||
                "-"}
            </div>
            <div>
              <strong>IFSC:</strong>{" "}
              {bank?.ifscCode || (seller as any)?.ifscCode || "-"}
            </div>
            <div>
              <strong>In Favour of:</strong>{" "}
              {bank?.bankingName || seller?.bankingName || "-"}
            </div>
          </div>

          {/* QR code */}
          <div className="flex items-center justify-center">
            {seller?.qrCodeUrl ? (
              <img
                src={seller.qrCodeUrl}
                alt="Payment QR"
                className="h-24 sm:h-32 object-contain"
              />
            ) : (
              <div className="text-[10px] sm:text-xs text-gray-500">
                No payment QR available
              </div>
            )}
          </div>

          {/* Signature */}
          <div className="text-right">
            {seller?.signatureUrl ? (
              <img
                src={seller.signatureUrl}
                alt="Signature"
                className="h-12 sm:h-16 object-contain mx-auto"
              />
            ) : (
              <div className="text-[10px] sm:text-xs text-gray-500">
                No signature uploaded
              </div>
            )}
            <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-center">
              {seller?.slogan || ""}
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="mt-2 sm:mt-3">
          <textarea
            suppressHydrationWarning
            placeholder="Remarks / Note (optional)"
            value={remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            className="w-full border rounded p-1 sm:p-2 text-[10px] sm:text-xs text-gray-900"
            rows={2}
          />
        </div>
      </div>
    </>
  );
}