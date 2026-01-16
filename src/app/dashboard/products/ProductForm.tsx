// icecream-inventory/src/app/dashboard/products/ProductForm.tsx
"use client";

import React from "react";
import { FormState } from "@/types/product.type";

interface ProductFormProps {
  formData: FormState;
  setFormData: React.Dispatch<React.SetStateAction<FormState>>;
  handleSubmit: (e: React.FormEvent) => void;
  cancelEdit: () => void;
  isSubmitting: boolean;
  editingId: string | null;
}

export default function ProductForm({
  formData,
  setFormData,
  handleSubmit,
  cancelEdit,
  isSubmitting,
  editingId,
}: ProductFormProps) {
    return (
        <form
          onSubmit={handleSubmit}
          className="
            bg-white rounded-xl shadow-sm border border-gray-200
            w-full max-w-2xl mx-auto
            px-4 py-4 sm:px-6 sm:py-5
          "
        >
          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Vanilla Cone"
                className="
                  mt-1 w-full h-9 px-3 text-sm
                  border border-gray-300 rounded-md
                  placeholder:text-gray-400
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700
                "
                required
              />
            </div>
      
            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Cone, Cup, Family Pack"
                className="text-gray-600
                  mt-1 w-full h-9 px-3 text-sm
                  border border-gray-300 rounded-md
                  placeholder:text-gray-400
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                "
              />
            </div>
      
            {/* Unit */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Unit *
              </label>
              <select
                value={formData.unit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unit: e.target.value as
                      | "piece"
                      | "box"
                      | "kg"
                      | "litre"
                      | "gm"
                      | "ml",
                  })
                }
                className="
                text-gray-600
                  mt-1 w-full h-9 px-2 text-sm
                  border border-gray-300 rounded-md
                  bg-white
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                "
                required
              >
                <option value="piece">Piece</option>
                <option value="box">Box</option>
                <option value="kg">Kg</option>
                <option value="litre">Litre</option>
                <option value="gm">Gram</option>
                <option value="ml">ML</option>
              </select>
            </div>
      
            {/* Pack Quantity */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Pack Quantity
              </label>
              <input
                type="number"
                min={0}
                value={formData.packQuantity}
                onChange={(e) =>
                  setFormData({ ...formData, packQuantity: e.target.value })
                }
                placeholder="e.g. 6 or 12"
                className="
                  mt-1 w-full h-9 px-3 text-sm text-gray-600
                  border border-gray-300 rounded-md
                  placeholder:text-gray-400
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                "
              />
            </div>
      
            {/* Pack Unit */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Pack Unit
              </label>
              <input
                type="text"
                value={formData.packUnit}
                onChange={(e) =>
                  setFormData({ ...formData, packUnit: e.target.value })
                }
                placeholder="e.g. 90ml / 1L / 500g"
                className=" text-gray-600
                  mt-1 w-full h-9 px-3 text-sm
                  border border-gray-300 rounded-md
                  placeholder:text-gray-400
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                "
              />
            </div>
      
            {/* Selling Price */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Selling Price *
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={formData.sellingPrice}
                onChange={(e) =>
                  setFormData({ ...formData, sellingPrice: e.target.value })
                }
                placeholder="e.g. 70"
                className="
                  mt-1 w-full h-9 px-3 text-sm text-gray-600
                  border border-gray-300 rounded-md
                  placeholder:text-gray-400
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                "
                required
              />
            </div>
      
            {/* MRP */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                MRP
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                placeholder="e.g. 80"
                className="
                  mt-1 w-full h-9 px-3 text-sm text-gray-600
                  border border-gray-300 rounded-md
                  placeholder:text-gray-400
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                "
              />
            </div>
      
            {/* Quantity */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Stock Quantity
              </label>
              <input
                type="number"
                min={0}
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="e.g. 100"
                className="
                  mt-1 w-full h-9 px-3 text-sm text-gray-600
                  border border-gray-300 rounded-md
                  placeholder:text-gray-400
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                "
              />
            </div>
      
            {/* Min Stock */}
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Minimum Stock
              </label>
              <input
                type="number"
                min={0}
                value={formData.minStock}
                onChange={(e) =>
                  setFormData({ ...formData, minStock: e.target.value })
                }
                placeholder="e.g. 10"
                className="
                  mt-1 w-full h-9 px-3 text-sm text-gray-600
                  border border-gray-300 rounded-md
                  placeholder:text-gray-400
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                "
              />
            </div>
          </div>
      
          {/* Notes */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-gray-600">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Optional notes (supplier, expiry, remarks)"
              className="
                mt-1 w-full px-3 py-2 text-sm text-gray-600
                border border-gray-300 rounded-md
                placeholder:text-gray-400
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
              "
            />
          </div>
      
          {/* Actions */}
          <div className="mt-5 flex justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSubmitting}
                className="
                  px-4 py-2 text-sm
                  border border-gray-300 rounded-md
                  text-gray-700 hover:bg-gray-100
                "
              >
                Cancel
              </button>
            )}
      
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                px-6 py-2 text-sm font-medium
                rounded-md bg-green-600 text-white
                hover:bg-green-700 disabled:opacity-60
              "
            >
              {isSubmitting
                ? "Saving..."
                : editingId
                ? "Update Product"
                : "Save Product"}
            </button>
          </div>
        </form>
      );
      
}
