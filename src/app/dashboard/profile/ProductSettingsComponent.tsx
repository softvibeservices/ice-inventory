// src/app/dashboard/profile/ProductSettingsComponent.tsx

"use client";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { Plus, X, Save, Check, AlertCircle } from "lucide-react";

interface ProductSettingsComponentProps {
  userId: string;
}
export default function ProductSettingsComponent({ userId }: ProductSettingsComponentProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [originalCategories, setOriginalCategories] = useState<string[]>([]);
  const [originalUnits, setOriginalUnits] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  // Check for unsaved changes
  useEffect(() => {
    const categoriesChanged = JSON.stringify(categories) !== JSON.stringify(originalCategories);
    const unitsChanged = JSON.stringify(units) !== JSON.stringify(originalUnits);
    setHasUnsavedChanges(categoriesChanged || unitsChanged);
  }, [categories, units, originalCategories, originalUnits]);

  // Auto-save when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges && categories.length > 0 && units.length > 0 && !isSavingRef.current) {
        // Trigger quick save on unmount
        saveSettingsQuick();
      }
    };
  }, [hasUnsavedChanges, categories, units]);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const res = await fetch(`/api/user-settings?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      
      if (res.ok) {
        const fetchedCategories = data.categories || [];
        const fetchedUnits = data.units || [];
        setCategories(fetchedCategories);
        setUnits(fetchedUnits);
        setOriginalCategories(fetchedCategories);
        setOriginalUnits(fetchedUnits);
      } else {
        toast.error(data.error || "Failed to load settings");
      }
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setFetching(false);
    }
  };

  // ✅ FIXED: Use regular fetch for quick save
  const saveSettingsQuick = async () => {
    if (categories.length === 0 || units.length === 0 || isSavingRef.current) return;

    isSavingRef.current = true;

    try {
      await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, categories, units }),
        keepalive: true, // Important for requests during page unload
      });
    } catch (error) {
      console.error("Quick save failed:", error);
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleSave = async (showToast = true) => {
    if (categories.length === 0) {
      toast.error("Please add at least one category");
      return;
    }
    if (units.length === 0) {
      toast.error("Please add at least one unit");
      return;
    }

    if (isSavingRef.current) return;

    try {
      isSavingRef.current = true;
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
        setOriginalCategories([...categories]);
        setOriginalUnits([...units]);
        setLastSavedTime(new Date());
        if (showToast) {
          toast.success("Settings saved successfully ✅", {
            duration: 3000,
            icon: "💾",
          });
        }
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
      isSavingRef.current = false;
    }
  };

  const scheduleAutoSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (hasUnsavedChanges && categories.length > 0 && units.length > 0) {
        handleSave(false);
        toast.success("Auto-saved changes", {
          duration: 2000,
          icon: "💾",
        });
      }
    }, 3000); // Auto-save after 3 seconds of inactivity
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
    toast.success(`Category "${trimmed}" added`, { icon: "✅", duration: 2000 });
    scheduleAutoSave();
  };

  const removeCategory = (index: number) => {
    const removedCategory = categories[index];
    setCategories(categories.filter((_, i) => i !== index));
    toast.success(`Category "${removedCategory}" removed`, { icon: "🗑️", duration: 2000 });
    scheduleAutoSave();
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
    toast.success(`Unit "${trimmed}" added`, { icon: "✅", duration: 2000 });
    scheduleAutoSave();
  };

  const removeUnit = (index: number) => {
    const removedUnit = units[index];
    setUnits(units.filter((_, i) => i !== index));
    toast.success(`Unit "${removedUnit}" removed`, { icon: "🗑️", duration: 2000 });
    scheduleAutoSave();
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            ⚙️ Product Settings
          </h2>
          {lastSavedTime && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Check size={14} className="text-green-600" />
              Last saved: {lastSavedTime.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-amber-600 text-sm font-medium px-3 py-2 bg-amber-50 rounded-lg">
              <AlertCircle size={16} />
              Unsaved changes
            </div>
          )}
          <button
            onClick={() => handleSave(true)}
            disabled={loading || !hasUnsavedChanges}
            className={`w-full sm:w-auto px-6 py-2 rounded-lg shadow font-medium flex items-center justify-center gap-2 transition-all ${
              hasUnsavedChanges && !loading
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Save size={18} />
            {loading ? "Saving..." : hasUnsavedChanges ? "Save Settings" : "All Saved"}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Auto-save enabled:</strong> Changes are automatically saved after 3 seconds of inactivity. You can also manually save using the button above.
            </p>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 sm:p-6 border border-blue-100 shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
          📋 Product Categories
          <span className="text-xs font-normal text-gray-500 bg-blue-100 px-2 py-1 rounded-full">
            {categories.length} {categories.length === 1 ? "category" : "categories"}
          </span>
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Categories that will appear in the product form dropdown
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
            className="flex-1 border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            onClick={addCategory}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-white rounded-lg border border-gray-200">
          {categories.length === 0 ? (
            <div className="w-full text-center py-4">
              <p className="text-sm text-gray-400 italic">No categories added yet. Add your first category above.</p>
            </div>
          ) : (
            categories.map((cat, idx) => (
              <div
                key={idx}
                className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="font-medium">{cat}</span>
                <button
                  onClick={() => removeCategory(idx)}
                  className="text-blue-600 hover:text-blue-800 transition-colors hover:bg-blue-200 rounded-full p-1"
                  title="Remove category"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Units Section */}
      <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 sm:p-6 border border-purple-100 shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
          📏 Measurement Units
          <span className="text-xs font-normal text-gray-500 bg-purple-100 px-2 py-1 rounded-full">
            {units.length} {units.length === 1 ? "unit" : "units"}
          </span>
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Units for product measurements (Unit and Pack Unit fields)
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
            className="flex-1 border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
          <button
            onClick={addUnit}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-white rounded-lg border border-gray-200">
          {units.length === 0 ? (
            <div className="w-full text-center py-4">
              <p className="text-sm text-gray-400 italic">No units added yet. Add your first unit above.</p>
            </div>
          ) : (
            units.map((unit, idx) => (
              <div
                key={idx}
                className="bg-purple-100 text-purple-800 px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="font-medium">{unit}</span>
                <button
                  onClick={() => removeUnit(idx)}
                  className="text-purple-600 hover:text-purple-800 transition-colors hover:bg-purple-200 rounded-full p-1"
                  title="Remove unit"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Usage Note */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Usage:</strong> These settings are used when creating or editing products in your inventory. Make sure to add all necessary categories and units before adding products.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}