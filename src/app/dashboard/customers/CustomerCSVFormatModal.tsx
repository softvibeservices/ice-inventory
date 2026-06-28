// src/app/dashboard/customers/CustomerCSVFormatModal.tsx
"use client";

import { X, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface CustomerCSVFormatModalProps {
  onClose: () => void;
}

export default function CustomerCSVFormatModal({ onClose }: CustomerCSVFormatModalProps) {
  // Required fields first, optional after
  const headers = [
    "Customer Name",   // ✅
    "Shop Name",       // ✅
    "Contact 1",       // ✅
    "Latitude",        // ✅
    "Longitude",       // ✅
    "Contact 2",       // optional
    "Contact 3",       // optional
    "Shop Address",    // optional
    "Area",            // optional
    "Remarks",         // optional
    "Opening Credit",  // optional
    "Opening Debit",   // optional
  ];

  const sampleData = [
    [
      "Raj Patel",
      "Raj Ice Cream",
      "9876543210",
      "21.1702",
      "72.8311",
      "9876543211",
      "",
      "Shop 5 Main Road Adajan",
      "Adajan",
      "Regular customer",
      "500",
      "0",
    ],
    [
      "Suresh Shah",
      "Shah Cold Store",
      "9988776655",
      "21.1940",
      "72.8290",
      "",
      "",
      "Near Bus Stand Varachha",
      "Varachha",
      "",
      "0",
      "200",
    ],
  ];

  const handleDownloadCSV = () => {
    const csvContent = [
      headers.join(","),
      ...sampleData.map((row) =>
        row.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "customers_template.csv";
    link.click();
  };

  const handleDownloadExcel = () => {
    const excelSampleData = [
      [
        "Raj Patel",
        "Raj Ice Cream",
        "9876543210",
        21.1702,
        72.8311,
        "9876543211",
        "",
        "Shop 5 Main Road Adajan",
        "Adajan",
        "Regular customer",
        500,
        0,
      ],
      [
        "Suresh Shah",
        "Shah Cold Store",
        "9988776655",
        21.1940,
        72.8290,
        "",
        "",
        "Near Bus Stand Varachha",
        "Varachha",
        "",
        0,
        200,
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelSampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "customers_template.xlsx");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              📄 Customer File Upload Format Guide
            </h3>
            <p className="text-base text-gray-700 mt-1">
              Follow these guidelines to upload customers successfully
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
          {/* Rules */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-lg">
            <h4 className="font-bold text-lg text-blue-900 mb-3 flex items-center gap-2">
              ✅ Important Rules
            </h4>
            <ul className="space-y-2.5 text-base text-blue-900">
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>One customer = one row in the file</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>
                  <strong>Do not change column names</strong> — they must match exactly
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>
                  <strong>Contact 1 is required</strong> and must be 6–15 digits (numbers only, no spaces or dashes)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>
                  <strong>Latitude</strong> must be a decimal number between –90 and 90 (e.g. 21.1702)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>
                  <strong>Longitude</strong> must be a decimal number between –180 and 180 (e.g. 72.8311)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>
                  Required fields are marked with ✅ — they cannot be empty
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>
                  <strong>Opening Credit / Debit</strong> should be numbers only (e.g. 500). Leave blank or enter 0 if none.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold mt-1">•</span>
                <span>Optional fields can be left empty</span>
              </li>
            </ul>
          </div>

          {/* Column Format Table */}
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-4">📋 Column Format</h4>
            <div className="overflow-x-auto border-2 border-gray-300 rounded-lg">
              <table className="w-full text-base">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Column Name</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-900">Required</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Example</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Customer Name</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-600 font-bold text-lg">✅</span></td>
                    <td className="px-4 py-3 text-gray-700">Raj Patel</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Full name of the customer</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Shop Name</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-600 font-bold text-lg">✅</span></td>
                    <td className="px-4 py-3 text-gray-700">Raj Ice Cream</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Name of the customer's shop</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Contact 1</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-600 font-bold text-lg">✅</span></td>
                    <td className="px-4 py-3 text-gray-700">9876543210</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Primary contact, 6–15 digits only</td>
                  </tr>
                  <tr className="hover:bg-blue-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Latitude</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-600 font-bold text-lg">✅</span></td>
                    <td className="px-4 py-3 text-gray-700">21.1702</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">GPS latitude, decimal number –90 to 90</td>
                  </tr>
                  <tr className="hover:bg-blue-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Longitude</td>
                    <td className="px-4 py-3 text-center"><span className="text-green-600 font-bold text-lg">✅</span></td>
                    <td className="px-4 py-3 text-gray-700">72.8311</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">GPS longitude, decimal number –180 to 180</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Contact 2</td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-400 font-bold text-lg">❌</span></td>
                    <td className="px-4 py-3 text-gray-700">9876543211</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Optional secondary contact</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Contact 3</td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-400 font-bold text-lg">❌</span></td>
                    <td className="px-4 py-3 text-gray-700"></td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Optional third contact</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Shop Address</td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-400 font-bold text-lg">❌</span></td>
                    <td className="px-4 py-3 text-gray-700">Shop 5 Main Road</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Full address of the shop</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Area</td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-400 font-bold text-lg">❌</span></td>
                    <td className="px-4 py-3 text-gray-700">Adajan</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Locality / area name</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Remarks</td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-400 font-bold text-lg">❌</span></td>
                    <td className="px-4 py-3 text-gray-700">Regular customer</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Any notes about the customer</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Opening Credit</td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-400 font-bold text-lg">❌</span></td>
                    <td className="px-4 py-3 text-gray-700">500</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Number only, default 0</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Opening Debit</td>
                    <td className="px-4 py-3 text-center"><span className="text-gray-400 font-bold text-lg">❌</span></td>
                    <td className="px-4 py-3 text-gray-700">0</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">Number only, default 0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Example preview */}
          <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-5">
            <h4 className="font-bold text-lg text-gray-900 mb-3">📝 Example File Content</h4>
            <pre className="text-sm text-gray-800 overflow-x-auto bg-white p-4 rounded-lg border border-gray-300 font-mono whitespace-pre">
{`Customer Name,Shop Name,Contact 1,Latitude,Longitude,Contact 2,Contact 3,Shop Address,Area,Remarks,Opening Credit,Opening Debit
Raj Patel,Raj Ice Cream,9876543210,21.1702,72.8311,9876543211,,Shop 5 Main Road Adajan,Adajan,Regular customer,500,0
Suresh Shah,Shah Cold Store,9988776655,21.1940,72.8290,,,Near Bus Stand Varachha,Varachha,,0,200`}
            </pre>
          </div>
        </div>

        {/* Footer */}
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
            <Download size={20} />
            Download CSV Template
          </button>
          <button
            onClick={handleDownloadExcel}
            className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2 transition-colors"
          >
            <Download size={20} />
            Download Excel Template
          </button>
        </div>
      </div>
    </div>
  );
}