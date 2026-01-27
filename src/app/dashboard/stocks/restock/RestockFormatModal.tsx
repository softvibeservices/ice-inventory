// src/app/dashboard/stocks/restock/RestockFormatModal.tsx
"use client";

import { X, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface RestockFormatModalProps {
  onClose: () => void;
}

export default function RestockFormatModal({ onClose }: RestockFormatModalProps) {
  const handleDownloadSample = () => {
    const headers = ["Product Name", "Quantity"];

    const sampleData = [
      ["Vanilla Cone", "50"],
      ["Chocolate Cup", "30"],
      ["Strawberry Bar", "25"],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "restock_sample.csv";
    link.click();
  };

  const handleDownloadExcel = () => {
    const headers = ["Product Name", "Quantity"];

    const sampleData = [
      ["Vanilla Cone", 50],
      ["Chocolate Cup", 30],
      ["Strawberry Bar", 25],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Restock");
    XLSX.writeFile(wb, "restock_sample.xlsx");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Bulk Restock File Format
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {/* Introduction */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-bold text-blue-900 mb-1.5 flex items-center gap-2 text-sm">
              📋 Quick Start
            </h4>
            <p className="text-xs text-blue-800">
              Upload a CSV or Excel file with product names and quantities. 
              We'll auto-fetch category and unit from your products.
            </p>
          </div>

          {/* Required Columns */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">
              📊 Required Columns
            </h4>
            <div className="bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-gray-900">
                      Column
                    </th>
                    <th className="px-3 py-2 text-left font-bold text-gray-900 hidden sm:table-cell">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left font-bold text-gray-900">
                      Example
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-300">
                    <td className="px-3 py-2 font-semibold text-gray-900">
                      Product Name *
                    </td>
                    <td className="px-3 py-2 text-gray-700 hidden sm:table-cell">
                      Exact name in database
                    </td>
                    <td className="px-3 py-2 text-gray-600 font-mono">
                      Vanilla Cone
                    </td>
                  </tr>
                  <tr className="border-t border-gray-300 bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-gray-900">
                      Quantity *
                    </td>
                    <td className="px-3 py-2 text-gray-700 hidden sm:table-cell">
                      Amount to add
                    </td>
                    <td className="px-3 py-2 text-gray-600 font-mono">
                      50
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-1.5 italic">
              * Required fields
            </p>
          </div>

          {/* Important Notes */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">
              ⚠️ Important Notes
            </h4>
            <div className="space-y-2">
              <div className="flex gap-2 bg-yellow-50 border border-yellow-300 rounded-lg p-2.5">
                <span className="text-yellow-600 font-bold text-sm flex-shrink-0">1.</span>
                <div>
                  <p className="font-semibold text-yellow-900 text-xs">
                    Product names must match exactly
                  </p>
                  <p className="text-xs text-yellow-800 mt-0.5">
                    Case-insensitive but spelling matters
                  </p>
                </div>
              </div>

              <div className="flex gap-2 bg-green-50 border border-green-300 rounded-lg p-2.5">
                <span className="text-green-600 font-bold text-sm flex-shrink-0">2.</span>
                <div>
                  <p className="font-semibold text-green-900 text-xs">
                    Auto-fetch category & unit
                  </p>
                  <p className="text-xs text-green-800 mt-0.5">
                    Don't include these in your file
                  </p>
                </div>
              </div>

              <div className="flex gap-2 bg-blue-50 border border-blue-300 rounded-lg p-2.5">
                <span className="text-blue-600 font-bold text-sm flex-shrink-0">3.</span>
                <div>
                  <p className="font-semibold text-blue-900 text-xs">
                    Quantity will be added
                  </p>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Not replaced. Example: 20 + 50 = 70
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Format */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">
              📝 Sample Format
            </h4>
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <pre className="text-green-400 text-xs font-mono">
{`Product Name,Quantity
Vanilla Cone,50
Chocolate Cup,30
Strawberry Bar,25`}
              </pre>
            </div>
          </div>

          {/* Download Buttons */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">
              📥 Download Sample Files
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleDownloadSample}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-xs sm:text-sm"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
              <button
                onClick={handleDownloadExcel}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-xs sm:text-sm"
              >
                <Download className="w-4 h-4" />
                Download Excel
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-semibold transition-colors text-xs sm:text-sm"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}