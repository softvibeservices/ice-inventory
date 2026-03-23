// icecream-inventory/src/app/dashboard/products/ProductForm.tsx
"use client";

import React, { useEffect, useState } from "react";
import { FormState } from "@/types/product.type";
import toast from "react-hot-toast";

interface ProductFormProps {
  formData: FormState;
  setFormData: React.Dispatch<React.SetStateAction<FormState>>;
  handleSubmit: (e: React.FormEvent) => void;
  cancelEdit: () => void;
  isSubmitting: boolean;
  editingId: string | null;
  userId: string;
}

export default function ProductForm({
  formData,
  setFormData,
  handleSubmit,
  cancelEdit,
  isSubmitting,
  editingId,
  userId,
}: ProductFormProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [packUnitNumber, setPackUnitNumber] = useState("");
  const [packUnitType, setPackUnitType] = useState("");
  const [existingProducts, setExistingProducts] = useState<any[]>([]); // ✅ NEW: Store existing products
  const [isDuplicate, setIsDuplicate] = useState(false); // ✅ NEW: Track if current form has duplicate

  // ✅ NEW: Fetch user settings and existing products on component mount
  useEffect(() => {
    const fetchData = async () => {
      console.log("🔄 Fetching settings and products for userId:", userId);
      
      if (!userId) {
        console.error("❌ No userId provided!");
        setLoadingSettings(false);
        toast.error("User ID not found. Please try logging in again.");
        return;
      }

      try {
        setLoadingSettings(true);
        
        // Fetch settings
        const settingsUrl = `/api/user-settings?userId=${encodeURIComponent(userId)}`;
        console.log("📡 Fetching settings from:", settingsUrl);
        
      const token = localStorage.getItem("token");
const settingsRes = await fetch(settingsUrl, {
  headers: { "Authorization": `Bearer ${token}` },
});
        const settingsData = await settingsRes.json();
        
        console.log("📥 Settings response status:", settingsRes.status);
        console.log("📦 Settings data:", settingsData);
        
        if (settingsRes.ok) {
          const fetchedCategories = settingsData.categories || [];
          const fetchedUnits = settingsData.units || [];
          
          setCategories(fetchedCategories);
          setUnits(fetchedUnits);
          
       
          
          // Set default unit if empty and units are available
          if (!formData.unit && fetchedUnits.length > 0) {
            setFormData({ ...formData, unit: fetchedUnits[0] });
          }
        } else {
          console.error("❌ Failed to load settings:", settingsData.error);
          toast.error(settingsData.error || "Failed to load product settings");
        }

        // ✅ NEW: Fetch existing products for duplicate detection
      const productsUrl = `/api/products`;  // userId no longer needed in URL
       
        
       // token already retrieved above in this same function
const productsRes = await fetch(`/api/products`, {
  headers: { "Authorization": `Bearer ${token}` },
});
        const productsData = await productsRes.json();
        
        if (productsRes.ok) {
          setExistingProducts(Array.isArray(productsData) ? productsData : []);
          console.log("✅ Products loaded for duplicate detection:", productsData.length);
        }
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        toast.error("Failed to load product settings");
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchData();
  }, [userId]);

  // Parse existing packUnit when editing
  useEffect(() => {
    if (formData.packUnit) {
      // Extract number and unit from packUnit (e.g., "100ml" -> "100" and "ml")
      const match = formData.packUnit.match(/^(\d+\.?\d*)([a-zA-Z]+)$/);
      if (match) {
        setPackUnitNumber(match[1]);
        setPackUnitType(match[2]);
      }
    }
  }, [formData.packUnit]);

  // ✅ NEW: Check for duplicates whenever relevant fields change
  useEffect(() => {
    if (!formData.name || !formData.category || !formData.unit || editingId) {
      setIsDuplicate(false);
      return;
    }

    const normalizedName = formData.name.trim().toLowerCase();
    const normalizedCategory = formData.category.trim().toLowerCase();
    const normalizedUnit = formData.unit.trim().toLowerCase();
    const normalizedPackQty = formData.packQuantity.trim();

    const duplicate = existingProducts.some((existing) => {
      // Skip the product being edited
      if (editingId && existing._id === editingId) {
        return false;
      }

      const existingPackQty = existing.packQuantity !== undefined && existing.packQuantity !== null 
        ? String(existing.packQuantity) 
        : "";
      
      return (
        existing.name.trim().toLowerCase() === normalizedName &&
        (existing.category || "").trim().toLowerCase() === normalizedCategory &&
        existing.unit.trim().toLowerCase() === normalizedUnit &&
        existingPackQty === normalizedPackQty
      );
    });

    setIsDuplicate(duplicate);
  }, [formData.name, formData.category, formData.unit, formData.packQuantity, existingProducts, editingId]);

  // Update packUnit when number or type changes
  const handlePackUnitChange = (number: string, type: string) => {
    setPackUnitNumber(number);
    setPackUnitType(type);
    
    if (number && type) {
      setFormData({ ...formData, packUnit: `${number}${type}` });
    } else {
      setFormData({ ...formData, packUnit: "" });
    }
  };

  // ✅ NEW: Wrapped submit handler to check for duplicates
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDuplicate) {
      toast.error("This product already exists! Please modify the details or edit the existing product.");
      return;
    }
    
    handleSubmit(e);
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-2xl mx-auto px-4 py-4 sm:px-6 sm:py-5"
    >
      {/* ✅ NEW: Duplicate Warning Banner */}
      {isDuplicate && (
        <div className="mb-4 p-4 bg-orange-100 border-2 border-orange-400 rounded-lg">
          <p className="text-sm font-bold text-orange-900 flex items-center gap-2">
            ⚠️ <span>This product already exists in your database with the same name, category, unit, and pack quantity. Please modify the details or edit the existing product instead.</span>
          </p>
        </div>
      )}

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
            className={`mt-1 w-full h-9 px-3 text-sm border rounded-md placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
              isDuplicate 
                ? "border-orange-400 bg-orange-50 text-orange-900" 
                : "border-gray-300 text-gray-700"
            }`}
            required
          />
        </div>
  
        {/* Category - DROPDOWN */}
        <div>
          <label className="text-xs font-semibold text-gray-600">
            Category *
          </label>
          {loadingSettings ? (
            <div className="mt-1 w-full h-9 px-3 text-sm border border-gray-300 rounded-md flex items-center text-gray-400">
              Loading...
            </div>
          ) : (
            <>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`mt-1 w-full h-9 px-2 text-sm border rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                  isDuplicate 
                    ? "border-orange-400 bg-orange-50 text-orange-900" 
                    : "border-gray-300 text-gray-600"
                }`}
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠️ No categories found. Add them in Profile → Product Settings
                </p>
              )}
            </>
          )}
        </div>
  
        {/* Unit - DROPDOWN */}
        <div>
          <label className="text-xs font-semibold text-gray-600">
            Unit *
          </label>
          {loadingSettings ? (
            <div className="mt-1 w-full h-9 px-3 text-sm border border-gray-300 rounded-md flex items-center text-gray-400">
              Loading...
            </div>
          ) : (
            <>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className={`mt-1 w-full h-9 px-2 text-sm border rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                  isDuplicate 
                    ? "border-orange-400 bg-orange-50 text-orange-900" 
                    : "border-gray-300 text-gray-600"
                }`}
                required
              >
                <option value="">Select Unit</option>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {units.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠️ No units found. Add them in Profile → Product Settings
                </p>
              )}
            </>
          )}
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
            onChange={(e) => setFormData({ ...formData, packQuantity: e.target.value })}
            placeholder="e.g. 6 or 12"
            className={`mt-1 w-full h-9 px-3 text-sm border rounded-md placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
              isDuplicate 
                ? "border-orange-400 bg-orange-50 text-orange-900" 
                : "border-gray-300 text-gray-600"
            }`}
          />
        </div>
  
        {/* Pack Unit - SPLIT INTO NUMBER + DROPDOWN */}
        <div>
          <label className="text-xs font-semibold text-gray-600">
            Pack Unit
          </label>
          <div className="flex gap-2">
            {/* Number Input */}
            <input
              type="number"
              min={0}
              step="any"
              value={packUnitNumber}
              onChange={(e) => handlePackUnitChange(e.target.value, packUnitType)}
              placeholder="e.g. 100"
              className="mt-1 w-1/2 h-9 px-3 text-sm text-gray-600 border border-gray-300 rounded-md placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {/* Unit Dropdown */}
            {loadingSettings ? (
              <div className="mt-1 w-1/2 h-9 px-2 text-sm border border-gray-300 rounded-md flex items-center text-gray-400">
                ...
              </div>
            ) : (
              <select
                value={packUnitType}
                onChange={(e) => handlePackUnitChange(packUnitNumber, e.target.value)}
                className="mt-1 w-1/2 h-9 px-2 text-sm border border-gray-300 rounded-md bg-white text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Unit</option>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">e.g., 100ml, 1L, 500gm</p>
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
            onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
            placeholder="e.g. 70"
            className="mt-1 w-full h-9 px-3 text-sm text-gray-600 border border-gray-300 rounded-md placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>
  
        {/* MRP */}
        <div>
          <label className="text-xs font-semibold text-gray-600">MRP</label>
          <input
            type="number"
            min={0}
            step="any"
            value={formData.mrp}
            onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
            placeholder="e.g. 80"
            className="mt-1 w-full h-9 px-3 text-sm text-gray-600 border border-gray-300 rounded-md placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="e.g. 100"
            className="mt-1 w-full h-9 px-3 text-sm text-gray-600 border border-gray-300 rounded-md placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
            onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
            placeholder="e.g. 10"
            className="mt-1 w-full h-9 px-3 text-sm text-gray-600 border border-gray-300 rounded-md placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>
  
      {/* Notes */}
      <div className="mt-4">
        <label className="text-xs font-semibold text-gray-600">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          placeholder="Optional notes (supplier, expiry, remarks)"
          className="mt-1 w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>
  
      {/* Actions */}
      <div className="mt-5 flex justify-end gap-3">
        {editingId && (
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
        )}
  
        <button
          type="submit"
          disabled={isSubmitting || loadingSettings || isDuplicate}
          className="px-6 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
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