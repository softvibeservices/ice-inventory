// src/app/dashboard/products/FileTemplateModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the old CSVFormatModal.tsx
// Rename the old file to FileTemplateModal.tsx  (or keep both and update the
// import in page.tsx to use FileTemplateModal).
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { X, Download, FileText, Table2, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface FileTemplateModalProps {
  onClose: () => void;
}

// ── Sample rows shared by both download helpers ───────────────────────────────
const HEADERS = [
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

const SAMPLE_ROWS_TEXT = [
  ["Vanilla Cone",    "Cone", "piece", "6",  "ml", "70", "80", "100", "10", "Summer favourite"],
  ["Chocolate Cup",   "Cups", "box",   "12", "ml", "60", "70",  "50",  "5", ""],
  ["Mango Stick",     "Stick","piece", "10", "ml", "45", "50", "200", "20", "Seasonal"],
];

const SAMPLE_ROWS_NUM = [
  ["Vanilla Cone",    "Cone", "piece",  6,   "ml",  70,  80,  100,  10, "Summer favourite"],
  ["Chocolate Cup",   "Cups", "box",   12,   "ml",  60,  70,   50,   5, ""],
  ["Mango Stick",     "Stick","piece", 10,   "ml",  45,  50,  200,  20, "Seasonal"],
];

// ── Column definitions for the guide table ───────────────────────────────────
const COLUMNS = [
  { name: "Product Name",   required: true,  example: "Vanilla Cone",  note: "Must be unique per product"              },
  { name: "Category",       required: true,  example: "Cone",          note: "Must match your Product Settings exactly" },
  { name: "Unit",           required: true,  example: "piece",         note: "Must match your Product Settings exactly" },
  { name: "Pack Quantity",  required: false, example: "6",             note: "Numbers only"                             },
  { name: "Pack Unit",      required: false, example: "ml",            note: "Must match your Product Settings"         },
  { name: "Selling Price",  required: true,  example: "70",            note: "Numbers only · must be > 0"              },
  { name: "MRP",            required: false, example: "80",            note: "Numbers only"                             },
  { name: "Stock Quantity", required: true,  example: "100",           note: "Numbers only · must be ≥ 0"              },
  { name: "Minimum Stock",  required: false, example: "10",            note: "Numbers only"                             },
  { name: "Notes",          required: false, example: "Summer item",   note: "Any free text"                            },
];

export default function FileTemplateModal({ onClose }: FileTemplateModalProps) {
  // ── CSV download ─────────────────────────────────────────────────────────
  const handleDownloadCSV = () => {
    const csvContent = [
      HEADERS.join(","),
      ...SAMPLE_ROWS_TEXT.map((row) =>
        row.map((cell) => (String(cell).includes(",") ? `"${cell}"` : cell)).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "products_template.csv";
    link.click();
  };

  // ── Excel download ────────────────────────────────────────────────────────
  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE_ROWS_NUM]);

    // Column widths
    worksheet["!cols"] = [
      { wch: 20 }, // Product Name
      { wch: 14 }, // Category
      { wch: 10 }, // Unit
      { wch: 14 }, // Pack Quantity
      { wch: 10 }, // Pack Unit
      { wch: 14 }, // Selling Price
      { wch: 10 }, // MRP
      { wch: 14 }, // Stock Quantity
      { wch: 14 }, // Minimum Stock
      { wch: 20 }, // Notes
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "products_template.xlsx");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Table2 className="w-6 h-6 text-blue-600" />
              Bulk Upload — File Templates
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Download a ready-to-fill template in your preferred format, then upload it via <strong>Bulk Upload</strong>.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── Download Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* CSV Card */}
            <div className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">CSV Template</h4>
                  <p className="text-sm text-gray-500">Comma-separated values · works with any spreadsheet app</p>
                </div>
              </div>
              <ul className="text-xs text-gray-500 space-y-1 mb-4">
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500 shrink-0" /> Opens in Excel, Google Sheets, LibreOffice</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500 shrink-0" /> Plain text — lightweight &amp; universal</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500 shrink-0" /> 3 sample rows included</li>
              </ul>
              <button
                onClick={handleDownloadCSV}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                           bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                           transition-colors"
              >
                <Download size={16} />
                Download CSV Template
              </button>
            </div>

            {/* Excel Card */}
            <div className="border-2 border-gray-200 rounded-xl p-5 hover:border-green-400 hover:shadow-md transition-all group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                  <Table2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Excel Template (.xlsx)</h4>
                  <p className="text-sm text-gray-500">Native Excel format · preserves numbers &amp; formatting</p>
                </div>
              </div>
              <ul className="text-xs text-gray-500 space-y-1 mb-4">
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500 shrink-0" /> Best for Microsoft Excel &amp; Google Sheets</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500 shrink-0" /> Numbers stay as numbers (no quote issues)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500 shrink-0" /> 3 sample rows · pre-set column widths</li>
              </ul>
              <button
                onClick={handleDownloadExcel}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                           bg-green-600 hover:bg-green-700 text-white text-sm font-semibold
                           transition-colors"
              >
                <Download size={16} />
                Download Excel Template
              </button>
            </div>
          </div>

          {/* ── Rules ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600" />
              Important Rules Before Uploading
            </h4>
            <ul className="space-y-1.5 text-sm text-amber-800">
              <li className="flex items-start gap-2"><span className="font-bold mt-0.5">1.</span><span>One product per row — do <strong>not</strong> change or reorder column headers.</span></li>
              <li className="flex items-start gap-2"><span className="font-bold mt-0.5">2.</span><span><strong>Category</strong> and <strong>Unit</strong> values must exactly match those in <em>Profile → Product Settings</em> (case-insensitive).</span></li>
              <li className="flex items-start gap-2"><span className="font-bold mt-0.5">3.</span><span>Required fields cannot be left blank — see the table below for which fields are required.</span></li>
              <li className="flex items-start gap-2"><span className="font-bold mt-0.5">4.</span><span>Delete the sample rows before uploading real data, or the system will flag them if they already exist.</span></li>
            </ul>
          </div>

          {/* ── Column Reference Table ── */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-gray-500" />
              Column Reference
            </h4>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700">Column Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-center">Required</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Example Value</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {COLUMNS.map((col) => (
                    <tr key={col.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{col.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        {col.required ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} /> Yes
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            Optional
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <code className="text-xs bg-gray-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                          {col.example}
                        </code>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{col.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Raw CSV Preview ── */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText size={16} className="text-gray-500" />
              Example CSV Contents
            </h4>
            <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-x-auto font-mono leading-relaxed whitespace-pre">
{`Product Name,Category,Unit,Pack Quantity,Pack Unit,Selling Price,MRP,Stock Quantity,Minimum Stock,Notes
Vanilla Cone,Cone,piece,6,ml,70,80,100,10,Summer favourite
Chocolate Cup,Cups,box,12,ml,60,70,50,5,
Mango Stick,Stick,piece,10,ml,45,50,200,20,Seasonal`}
            </pre>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownloadCSV}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold
                       flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={16} />
            Download CSV
          </button>
          <button
            onClick={handleDownloadExcel}
            className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold
                       flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={16} />
            Download Excel
          </button>
        </div>
      </div>
    </div>
  );
}