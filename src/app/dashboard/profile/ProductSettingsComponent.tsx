// src/app/dashboard/profile/ProductSettingsComponent.tsx

"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X, Save } from "lucide-react";

interface ProductSettingsComponentProps {
  userId: string;
}

export default function ProductSettingsComponent({ userId }: ProductSettingsComponentProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const res = await fetch(`/api/user-settings?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      
      if (res.ok) {
        setCategories(data.categories || []);
        setUnits(data.units || []);
      } else {
        toast.error(data.error || "Failed to load settings");
      }
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (categories.length === 0) {
      toast.error("Please add at least one category");
      return;
    }
    if (units.length === 0) {
      toast.error("Please add at least one unit");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          categories,
          units,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Settings saved successfully ✅");
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      toast.error("Category name cannot be empty");
      return;
    }
    if (categories.includes(trimmed)) {
      toast.error("Category already exists");
      return;
    }
    setCategories([...categories, trimmed]);
    setNewCategory("");
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const addUnit = () => {
    const trimmed = newUnit.trim();
    if (!trimmed) {
      toast.error("Unit name cannot be empty");
      return;
    }
    if (units.includes(trimmed)) {
      toast.error("Unit already exists");
      return;
    }
    setUnits([...units, trimmed]);
    setNewUnit("");
  };

  const removeUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          ⚙️ Product Settings
        </h2>
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Categories Section */}
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
          📋 Product Categories
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Add categories that will appear in the product form dropdown
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCategory();
            }}
            placeholder="Enter category name (e.g., Cups, Cones)"
            className="flex-1 border rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addCategory}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No categories added yet</p>
          ) : (
            categories.map((cat, idx) => (
              <div
                key={idx}
                className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg flex items-center gap-2"
              >
                <span className="font-medium">{cat}</span>
                <button
                  onClick={() => removeCategory(idx)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Units Section */}
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
          📏 Measurement Units
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Add units that will be used for product measurements (Unit and Pack Unit fields)
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addUnit();
            }}
            placeholder="Enter unit (e.g., ml, L, gm, kg)"
            className="flex-1 border rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addUnit}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {units.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No units added yet</p>
          ) : (
            units.map((unit, idx) => (
              <div
                key={idx}
                className="bg-purple-100 text-purple-800 px-3 py-2 rounded-lg flex items-center gap-2"
              >
                <span className="font-medium">{unit}</span>
                <button
                  onClick={() => removeUnit(idx)}
                  className="text-purple-600 hover:text-purple-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Note:</strong> These settings will be used when creating or editing products. Make sure to save your changes before leaving this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}