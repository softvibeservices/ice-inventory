// src/app/dashboard/stocks/EmptyStockModal.tsx

// src/app/dashboard/stocks/EmptyStockModal.tsx
"use client";

import { useState } from "react";
import { AlertTriangle, X, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

interface EmptyStockModalProps {
  showEmptyModal:    boolean;
  setShowEmptyModal: (value: boolean) => void;
  confirmText:       string;
  setConfirmText:    (value: string) => void;
  emptying:          boolean;
  emptyStock:        (otp: string) => void;
  requestOtp:        () => Promise<boolean>;
}

export default function EmptyStockModal({
  showEmptyModal,
  setShowEmptyModal,
  confirmText,
  setConfirmText,
  emptying,
  emptyStock,
  requestOtp,
}: EmptyStockModalProps) {
  const [step,    setStep]    = useState<1 | 2>(1);
  const [otp,     setOtp]     = useState("");
  const [sending, setSending] = useState(false);

  if (!showEmptyModal) return null;

  const isConfirmed = confirmText === "CONFIRM";

  const handleClose = () => {
    setShowEmptyModal(false);
    setConfirmText("");
    setOtp("");
    setStep(1);
    toast.dismiss();
  };

  const handleSendOtp = async () => {
    if (!isConfirmed) {
      toast.error('Please type "CONFIRM" to proceed');
      return;
    }
    setSending(true);
    const ok = await requestOtp();
    setSending(false);
    if (ok) {
      setStep(2);
    }
  };

  const handleEmptyStock = () => {
    if (!otp.trim()) {
      toast.error("Please enter the OTP sent to your email");
      return;
    }
    toast.loading("Emptying stock…");
    emptyStock(otp.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Danger Header ── */}
        <div className="bg-red-600 px-6 py-5 flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg leading-tight">Empty All Stock</h3>
            <p className="text-red-100 text-sm mt-0.5">This action is permanent and cannot be undone</p>
          </div>
          <button
            onClick={handleClose}
            disabled={emptying || sending}
            className="flex-shrink-0 text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step indicator ── */}
        <div className="flex items-center gap-0 px-6 pt-4">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= 1 ? "bg-red-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              1
            </div>
            <span className={`text-xs font-medium ${step === 1 ? "text-gray-900" : "text-gray-400"}`}>
              Confirm
            </span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 rounded ${step === 2 ? "bg-red-400" : "bg-gray-200"}`} />
          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === 2 ? "bg-red-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              2
            </div>
            <span className={`text-xs font-medium ${step === 2 ? "text-gray-900" : "text-gray-400"}`}>
              Verify OTP
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-4">

          {/* ════ STEP 1 ════ */}
          {step === 1 && (
            <>
              <p className="text-gray-700 text-sm leading-relaxed">
                All product quantities will be reset to{" "}
                <strong className="text-gray-900">zero</strong>. Your product list
                and settings will remain intact — only the stock quantities will be cleared.
              </p>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800">
                  Type{" "}
                  <code className="px-1.5 py-0.5 bg-gray-100 rounded text-red-600 font-mono text-xs">
                    CONFIRM
                  </code>{" "}
                  to proceed
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type CONFIRM here"
                  autoFocus
                  disabled={sending}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border outline-none transition-all font-mono ${
                    isConfirmed
                      ? "border-red-400 bg-red-50 text-red-800 focus:ring-2 focus:ring-red-300"
                      : "border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                  } disabled:opacity-60`}
                />
              </div>

              {isConfirmed && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  <span>
                    An OTP will be sent to your registered email address.
                    You will need to enter it in the next step to confirm.
                  </span>
                </div>
              )}
            </>
          )}

          {/* ════ STEP 2 ════ */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 px-3 py-3 bg-green-50 border border-green-200 rounded-lg">
                <Mail className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800 font-medium">
                  OTP sent! Check your registered email inbox.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800">
                  Enter the 6-digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 123456"
                  autoFocus
                  disabled={emptying}
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 outline-none
                             transition-all font-mono text-center text-lg tracking-widest
                             focus:ring-2 focus:ring-red-300 focus:border-red-400
                             disabled:opacity-60"
                />
              </div>

              <button
                onClick={handleSendOtp}
                disabled={sending || emptying}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Resend OTP
              </button>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={emptying || sending}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          {step === 1 ? (
            <button
              onClick={handleSendOtp}
              disabled={!isConfirmed || sending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending OTP…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send OTP to Email
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleEmptyStock}
              disabled={otp.length < 6 || emptying}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {emptying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Emptying…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Verify &amp; Empty Stock
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}