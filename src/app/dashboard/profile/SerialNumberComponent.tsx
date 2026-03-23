// src/app/dashboard/profile/SerialNumberComponent.tsx

"use client";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

interface SerialNumberComponentProps {
  userId: string;
}

export default function SerialNumberComponent({ userId }: SerialNumberComponentProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [currentSerial, setCurrentSerial] = useState<string>("");
  const [loadingSerial, setLoadingSerial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefix, setPrefix] = useState<string>("");
  const [userDigits, setUserDigits] = useState<string>("    ");
  const digitRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  useEffect(() => {
    const now = new Date();
    const yy = String(now.getFullYear() % 100).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    setPrefix(yy + mm);
  }, []);

  const fetchCurrentSerial = async () => {
    setLoadingSerial(true);
    try {
      const token = localStorage.getItem("token");
const res = await fetch(`/api/bills/next-serial?userId=${encodeURIComponent(userId)}`, {
  headers: { "Authorization": `Bearer ${token}` },
});
      const data = await res.json();
      if (res.ok && data.nextSerial?.length === 8) {
        setCurrentSerial(data.nextSerial);
        setUserDigits(data.nextSerial.substring(4));
      } else {
        setCurrentSerial("Not set");
        setUserDigits("    ");
      }
    } catch {
      setCurrentSerial("Error");
      setUserDigits("    ");
    } finally {
      setLoadingSerial(false);
    }
  };

  useEffect(() => {
    if (showDialog) fetchCurrentSerial();
  }, [showDialog, userId]);

  const handleDigitInput = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      const arr = userDigits.split("");
      arr[index] = " ";
      setUserDigits(arr.join(""));
      if (index > 0) digitRefs.current[index - 1]?.focus();
      return;
    }
    const lastChar = raw.slice(-1);
    if (!/^\d$/.test(lastChar)) return;
    const arr = userDigits.split("");
    arr[index] = lastChar;
    setUserDigits(arr.join(""));
    if (index < 3) digitRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const cv = userDigits[index];
      if (cv?.trim()) {
        e.preventDefault();
        const arr = userDigits.split(""); arr[index] = " "; setUserDigits(arr.join(""));
      } else {
        e.preventDefault();
        if (index > 0) {
          const arr = userDigits.split(""); arr[index - 1] = " "; setUserDigits(arr.join(""));
          digitRefs.current[index - 1]?.focus();
        }
      }
    }
    if (e.key === "ArrowLeft" && index > 0) { e.preventDefault(); digitRefs.current[index - 1]?.focus(); }
    if (e.key === "ArrowRight" && index < 3) { e.preventDefault(); digitRefs.current[index + 1]?.focus(); }
  };

  const handleDigitFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  const cleanDigits = userDigits.replace(/ /g, "0");
  const allFilled = userDigits.split("").every((ch) => ch.trim() !== "");
  const fullSerial = prefix + cleanDigits;
  const nextBillSerial = prefix + String(parseInt(cleanDigits || "0", 10) + 1).padStart(4, "0");
  const prefixYY = prefix.substring(0, 2);
  const prefixMM = prefix.substring(2, 4);

  const handleSaveSerial = async () => {
    if (!allFilled) { toast.error("Please fill all 4 sequence digits"); return; }
    const seqValue = parseInt(cleanDigits, 10);
    if (seqValue < 1 || seqValue > 9999) { toast.error("Sequence must be between 0001 and 9999"); return; }
    setSaving(true);
    try {
    const token = localStorage.getItem("token");
const res = await fetch("/api/profile/update-serial", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({ serialNumber: fullSerial }),  // userId removed
});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success("Serial number updated successfully ✅");
      setCurrentSerial(fullSerial);
      sessionStorage.setItem("billing-serial-preview", fullSerial);
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update serial number");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setUserDigits("    ");
    setCurrentSerial("");
  };

  // A single digit cell — locked (grey) or editable (blue)
  const LockedDigit = ({ value, label }: { value: string; label: string }) => (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 font-mono text-lg font-semibold select-none">
        {value}
      </div>
      <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide">{label}</span>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium hover:bg-gray-100 text-gray-700 transition-colors"
      >
        🔢 Set Bill Serial Number
      </button>

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxWidth: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)" }} />

            <div className="p-6">

              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Bill Serial Number</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Override the current billing sequence</p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors font-bold text-base"
                >
                  ✕
                </button>
              </div>

              {/* Current serial card */}
              <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-500 font-bold text-base shrink-0">
                  #
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Next Queued Serial</p>
                  {loadingSerial ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-xs text-gray-400">Fetching...</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-mono font-bold text-blue-700 tracking-[0.2em] leading-tight mt-0.5">
                      {currentSerial || "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Digit entry — KEY FIX: single non-wrapping row */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Set Sequence &nbsp;·&nbsp; Format: YY MM – XXXX
                </p>

                {/* 
                  All 8 boxes in one flex row that NEVER wraps.
                  Using inline-flex + overflow-hidden on the container 
                  so it scales down instead of wrapping on small screens.
                */}
                <div className="flex items-end justify-center gap-2" style={{ minWidth: 0 }}>

                  {/* YY locked */}
                  <LockedDigit value={prefixYY[0] || ""} label="Y" />
                  <LockedDigit value={prefixYY[1] || ""} label="Y" />

                  {/* Group separator */}
                  <div className="pb-6 text-gray-200 text-xl font-light select-none">·</div>

                  {/* MM locked */}
                  <LockedDigit value={prefixMM[0] || ""} label="M" />
                  <LockedDigit value={prefixMM[1] || ""} label="M" />

                  {/* Dash */}
                  <div className="pb-6 text-gray-300 text-lg font-semibold select-none px-0.5">–</div>

                  {/* XXXX editable */}
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <input
                        ref={(el) => { digitRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={userDigits[i]?.trim() || ""}
                        onChange={(e) => handleDigitInput(i, e)}
                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                        onFocus={handleDigitFocus}
                        placeholder="0"
                        className="w-12 h-12 text-center font-mono text-lg font-bold rounded-xl border-2 border-blue-400 bg-white text-gray-900 placeholder-gray-200 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 hover:border-blue-500 transition-all"
                      />
                      <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend row */}
              <div className="flex items-center gap-2 mb-5 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" />
                  Locked (year + month)
                </span>
                <span className="text-gray-200">·</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />
                  Editable sequence
                </span>
                <span className="text-gray-200">·</span>
                <span>Next bill = your value + 1</span>
              </div>

              {/* Preview — only shown when all filled */}
              <div className={`mb-5 rounded-xl border overflow-hidden transition-all duration-200 ${allFilled ? "opacity-100" : "opacity-40"}`}
                style={{ borderColor: "#e9d5ff", background: "linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%)" }}
              >
                <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Next bill will get</p>
                    <p className="text-2xl font-mono font-bold text-purple-700 tracking-[0.15em] mt-0.5">
                      {allFilled ? nextBillSerial : `${prefix}????`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400">Counter set to</p>
                    <p className="text-sm font-mono font-semibold text-gray-500">{allFilled ? fullSerial : "—"}</p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleClose}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSerial}
                  disabled={saving || !allFilled}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ background: saving || !allFilled ? "#93c5fd" : "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Serial Number"
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}