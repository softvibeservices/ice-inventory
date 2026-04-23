// src/app/dashboard/products/CSVFormatModal.tsx
"use client";

import { X, Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";

interface CSVFormatModalProps {
  onClose: () => void;
}

export default function CSVFormatModal({ onClose }: CSVFormatModalProps) {
  const handleDownloadCSV = () => {
    const headers = [
      "Product Name",
      "Category",
      "Unit",
      "Pack Quantity",
      "Pack Unit",
      "Selling Price",
      "MRP",
      "Stock Quantity",
      "Minimum Stock",
      "Notes",
    ];

    const sampleData = [
      [
        "Vanilla Cone",
        "Cone",
        "piece",
        "6",
        "ml",
        "70",
        "80",
        "100",
        "10",
        "Summer item",
      ],
      [
        "Chocolate Cup",
        "Cups",
        "box",
        "12",
        "ml",
        "60",
        "70",
        "50",
        "5",
        "",
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "products_template.csv";
    link.click();
  };

  const handleDownloadExcel = () => {
    const headers = [
      "Product Name",
      "Category",
      "Unit",
      "Pack Quantity",
      "Pack Unit",
      "Selling Price",
      "MRP",
      "Stock Quantity",
      "Minimum Stock",
      "Notes",
    ];

    const sampleData = [
      [
        "Vanilla Cone",
        "Cone",
        "piece",
        6,
        "ml",
        70,
        80,
        100,
        10,
        "Summer item",
      ],
      [
        "Chocolate Cup",
        "Cups",
        "box",
        12,
        "ml",
        60,
        70,
        50,
        5,
        "",
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    XLSX.writeFile(workbook, "products_template.xlsx");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              📄 Bulk Upload Format Guide
            </h3>
            <p className="text-base text-gray-600 mt-1">
              Supports both <span className="font-semibold text-gray-800">CSV</span> and{" "}
              <span className="font-semibold text-gray-800">Excel (.xlsx)</span> file formats
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Supported Formats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-blue-900 text-sm">CSV Format</p>
                <p className="text-xs text-blue-700">Comma-separated values (.csv)</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-green-900 text-sm">Excel Format</p>
                <p className="text-xs text-green-700">Excel workbook (.xlsx / .xls)</p>
              </div>
            </div>
          </div>

          {/* Section 1: Rules */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-lg">
            <h4 className="font-bold text-lg text-blue-900 mb-3 flex items-center gap-2">
              ✅ Important Rules
            </h4>
            <ul className="space-y-2.5 text-base text-blue-900">
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>One product = one row in the file</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>
                  <strong>Do not change column names</strong> — they must match exactly (same in both CSV and Excel)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>
                  <strong>Category and Unit values must match</strong> your existing settings in Profile → Product Settings (case-insensitive)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>
                  Required fields are marked with ✅ below — they cannot be empty
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>Optional fields can be left empty</span>
              </li>
            </ul>
          </div>

          {/* Section 2: Column Table */}
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-4">
              📋 Column Format
            </h4>
            <div className="overflow-x-auto border-2 border-gray-300 rounded-lg">
              <table className="w-full text-base">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">
                      Column Name
                    </th>
                    <th className="px-4 py-3 text-center font-bold text-gray-900">
                      Required
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">
                      Example
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Product Name</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600 font-bold text-lg">✅</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">Vanilla Cone</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Must be unique</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Category</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600 font-bold text-lg">✅</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">Cone</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Must match Product Settings</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Unit</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600 font-bold text-lg">✅</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">piece</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Must match Product Settings</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Pack Quantity</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-400 font-bold text-lg">❌</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">6</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Number only</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Pack Unit</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-400 font-bold text-lg">❌</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">ml</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Must match Product Settings</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Selling Price</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600 font-bold text-lg">✅</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">70</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Number only, &gt; 0</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">MRP</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-400 font-bold text-lg">❌</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">80</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Number only</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Stock Quantity</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600 font-bold text-lg">✅</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">100</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Number only, ≥ 0</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Minimum Stock</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-400 font-bold text-lg">❌</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">10</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Number only</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Notes</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-400 font-bold text-lg">❌</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">Summer item</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Any text</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Example Preview — CSV */}
          <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-5">
            <h4 className="font-bold text-lg text-gray-900 mb-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              CSV — Example File Content
            </h4>
            <p className="text-sm text-gray-500 mb-3">
              The first row must be the header row exactly as shown below.
            </p>
            <pre className="text-sm text-gray-800 overflow-x-auto bg-white p-4 rounded-lg border border-gray-300 font-mono">
{`Product Name,Category,Unit,Pack Quantity,Pack Unit,Selling Price,MRP,Stock Quantity,Minimum Stock,Notes
Vanilla Cone,Cone,piece,6,ml,70,80,100,10,Summer item
Chocolate Cup,Cups,box,12,ml,60,70,50,5,`}
            </pre>
          </div>

          {/* Example Preview — Excel */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-5">
            <h4 className="font-bold text-lg text-gray-900 mb-1 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Excel — Example Layout
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Same column headers in Row 1, product data starting from Row 2.
              Numeric columns (price, quantity) should be stored as numbers, not text.
            </p>
            <div className="overflow-x-auto rounded-lg border border-green-300 bg-white">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-green-100">
                    {["Product Name","Category","Unit","Pack Qty","Pack Unit","Sell Price","MRP","Stock Qty","Min Stock","Notes"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-bold text-green-900 border-r border-green-200 last:border-r-0 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-green-100">
                    {["Vanilla Cone","Cone","piece","6","ml","70","80","100","10","Summer item"].map((v, i) => (
                      <td key={i} className="px-3 py-2 text-gray-700 border-r border-green-100 last:border-r-0 whitespace-nowrap">{v}</td>
                    ))}
                  </tr>
                  <tr className="border-t border-green-100 bg-green-50/50">
                    {["Chocolate Cup","Cups","box","12","ml","60","70","50","5",""].map((v, i) => (
                      <td key={i} className="px-3 py-2 text-gray-700 border-r border-green-100 last:border-r-0 whitespace-nowrap">{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer — download both templates side by side */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 px-6 py-5 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownloadCSV}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 transition-colors"
          >
            <Download size={18} />
            Download CSV Template
          </button>
          <button
            onClick={handleDownloadExcel}
            className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2 transition-colors"
          >
            <Download size={18} />
            Download Excel Template
          </button>
        </div>
      </div>
    </div>
  );
}