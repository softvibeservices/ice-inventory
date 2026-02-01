// src/app/dashboard/profile/SerialNumberComponent.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

interface SerialNumberComponentProps {
  userId: string;
}

export default function SerialNumberComponent({
  userId,
}: SerialNumberComponentProps) {
  const [showSerialDialog, setShowSerialDialog] = useState(false);
  const [currentSerial, setCurrentSerial] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // State for the 6-digit serial number (2 month digits + 4 user digits)
  const [monthDigits, setMonthDigits] = useState<string>(""); // First 2 digits (month)
  // ✅ FIX: initialise as empty string, not "0000" — we populate it properly in fetchCurrentSerial
  const [userDigits, setUserDigits] = useState<string>("    "); // 4 spaces = empty slots

  // Refs for the 4 editable digit inputs
  const digitRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  // Get current month for the first 2 digits
  useEffect(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    setMonthDigits(month);
  }, []);

  // Fetch current serial number from DB
  const fetchCurrentSerial = async () => {
    try {
      const res = await fetch(`/api/profile?userId=${userId}`);
      const data = await res.json();

      if (data && data.lastSerialNumber && data.lastSerialNumber.length === 6) {
        setCurrentSerial(data.lastSerialNumber);
        // Pre-fill the last 4 digits so the user sees what's already saved
        setUserDigits(data.lastSerialNumber.substring(2));
      } else {
        setCurrentSerial("Not set");
        // ✅ FIX: leave blank so inputs are empty and immediately typeable
        setUserDigits("    ");
      }
    } catch (err) {
      console.error("Error fetching serial:", err);
    }
  };

  useEffect(() => {
    if (showSerialDialog) {
      fetchCurrentSerial();
    }
  }, [showSerialDialog, userId]);

  // ✅ REWRITTEN: single handler that replaces the digit at the given index
  //    and moves focus forward automatically.
  const handleDigitInput = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // If the field was cleared (Backspace cleared it) — set that slot to space
    if (raw === "") {
      const arr = userDigits.split("");
      arr[index] = " ";
      setUserDigits(arr.join(""));
      // Move focus to previous input on clear
      if (index > 0) {
        digitRefs.current[index - 1]?.focus();
      }
      return;
    }

    // Extract only the last character typed (handles both empty→char and char→newchar)
    const lastChar = raw.slice(-1);

    // Only accept digits
    if (!/^\d$/.test(lastChar)) return;

    const arr = userDigits.split("");
    arr[index] = lastChar;
    setUserDigits(arr.join(""));

    // Auto-advance focus to next input
    if (index < 3) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  // ✅ REWRITTEN: handle Backspace cleanly
  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const currentVal = userDigits[index];

      if (currentVal && currentVal.trim() !== "") {
        // Slot has a digit — clear it, stay on same input
        e.preventDefault();
        const arr = userDigits.split("");
        arr[index] = " ";
        setUserDigits(arr.join(""));
      } else {
        // Slot is already empty — move back and clear the previous one
        e.preventDefault();
        if (index > 0) {
          const arr = userDigits.split("");
          arr[index - 1] = " ";
          setUserDigits(arr.join(""));
          digitRefs.current[index - 1]?.focus();
        }
      }
    }

    // Allow arrow keys for manual navigation
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      digitRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 3) {
      e.preventDefault();
      digitRefs.current[index + 1]?.focus();
    }
  };

  // On focus: select all text in the input so typing replaces it instantly
  const handleDigitFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // Compute the clean 4-digit string (spaces → "0" for display/validation)
  const cleanDigits = userDigits.replace(/ /g, "0");
  // Whether all 4 slots have been explicitly filled by the user
  const allFilled = userDigits.split("").every((ch) => ch.trim() !== "");

  // Save the serial number
  const handleSaveSerial = async () => {
    if (!allFilled) {
      toast.error("Please enter all 4 digits");
      return;
    }

    const fullSerial = monthDigits + cleanDigits;
    const serialValue = parseInt(cleanDigits, 10);

    if (serialValue < 1 || serialValue > 9999) {
      toast.error("Serial number must be between 0001 and 9999");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/profile/update-serial", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          serialNumber: fullSerial,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update serial number");
      }

      toast.success("Serial number updated successfully! ✅");
      setCurrentSerial(fullSerial);
      setShowSerialDialog(false);

      // Update sessionStorage so the billing page picks it up immediately
      sessionStorage.setItem("billing-serial", fullSerial);
    } catch (err: any) {
      console.error("Error updating serial:", err);
      toast.error(err.message || "Failed to update serial number ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowSerialDialog(true)}
        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium hover:bg-gray-100 text-gray-700 transition-colors"
      >
        🔢 Set Bill Serial Number
      </button>

      {/* Serial Number Dialog */}
      {showSerialDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Set Bill Serial Number
            </h2>

            {/* Current Serial Display */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Current Serial:</strong>{" "}
                <span className="text-blue-600 font-mono text-lg">
                  {currentSerial || "Not set"}
                </span>
              </p>
            </div>

            {/* Information Box */}
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">
                <strong>Serial Number Format:</strong>
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono bg-green-100 text-green-800 px-2 py-1 rounded border border-green-300">
                  {monthDigits}
                </span>
                <span className="text-xs text-gray-500">+</span>
                <span className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-300">
                  XXXX
                </span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• <strong>First 2 digits:</strong> Current month (auto-set, cannot change)</li>
                <li>• <strong>Last 4 digits:</strong> Your custom number (0001-9999)</li>
                <li>• Next bill will use: <strong>{monthDigits}{cleanDigits}</strong></li>
              </ul>
            </div>

            {/* Input Boxes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Serial Number
              </label>
              <div className="flex gap-2 justify-center items-center">
                {/* Month digits — read-only */}
                <input
                  type="text"
                  value={monthDigits[0] || ""}
                  disabled
                  className="w-12 h-14 text-center text-xl font-mono border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
                <input
                  type="text"
                  value={monthDigits[1] || ""}
                  disabled
                  className="w-12 h-14 text-center text-xl font-mono border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />

                <span className="text-gray-400 text-2xl">-</span>

                {/* User digits — editable */}
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { digitRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={userDigits[i]?.trim() || ""}
                    onChange={(e) => handleDigitInput(i, e)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onFocus={handleDigitFocus}
                    placeholder="0"
                    className="w-12 h-14 text-center text-xl font-mono border-2 border-blue-500 rounded-lg
                               focus:ring-2 focus:ring-blue-300 focus:border-blue-600
                               placeholder-gray-300 text-gray-900 bg-white"
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Next bill serial will be:</strong>{" "}
                <span className="text-purple-600 font-mono text-lg">
                  {monthDigits}{cleanDigits}
                </span>
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSerialDialog(false);
                  setUserDigits("    ");
                }}
                className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSerial}
                disabled={loading || !allFilled}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {loading ? "Saving..." : "Save Serial Number"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}