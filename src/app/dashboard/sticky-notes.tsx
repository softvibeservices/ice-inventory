// src/app/dashboard/sticky-notes.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  StickyNote as StickyIcon,
  Plus,
  Trash2,
  Truck,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import type {
  Product,
  Customer,
  StickyNote,
} from "./types";
import StickyNoteModal from "./StickyNoteModal";

export function StickyNotesPanel() {
  // ========= STATE =========
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<StickyNote | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const NOTES_PER_PAGE = 12;

  // ========= INIT USER =========
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {
        // ignore
      }
    }
  }, []);

  // ========= FETCH PRODUCTS / CUSTOMERS / NOTES =========
  useEffect(() => {
    if (!userId) return;

    const fetchMasterData = async () => {
      try {
        const [prodRes, custRes, notesRes] = await Promise.all([
          fetch(`/api/products?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/customers?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/sticky-notes?userId=${encodeURIComponent(userId)}`),
        ]);

        if (!prodRes.ok) throw new Error("Products fetch failed");
        if (!custRes.ok) throw new Error("Customers fetch failed");
        if (!notesRes.ok) throw new Error("Sticky notes fetch failed");

        const prodData = await prodRes.json();
        const custData = await custRes.json();
        const notesData = await notesRes.json();

        setProducts(Array.isArray(prodData) ? prodData : []);
        setCustomers(Array.isArray(custData) ? custData : []);
        setNotes(Array.isArray(notesData) ? notesData : []);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to load sticky notes data");
      } finally {
        setLoadingNotes(false);
      }
    };

    setLoadingNotes(true);
    fetchMasterData();
  }, [userId]);

  // ========= SEARCH & FILTER =========
  const filteredNotes = notes.filter((note) => {
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    const shopMatch = note.shopName?.toLowerCase().includes(term);
    const customerMatch = note.customerName?.toLowerCase().includes(term);
    const itemsMatch = note.items.some(item =>
      item.productName?.toLowerCase().includes(term)
    );

    return shopMatch || customerMatch || itemsMatch;
  });

  // ========= PAGINATION =========
  const totalPages = Math.ceil(filteredNotes.length / NOTES_PER_PAGE);
  const paginatedNotes = showAll
    ? filteredNotes
    : filteredNotes.slice(
        (currentPage - 1) * NOTES_PER_PAGE,
        currentPage * NOTES_PER_PAGE
      );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ========= HELPERS =========
  const openCreateModal = () => {
    setEditingNote(null);
    setShowModal(true);
  };

  const openEditModal = (note: StickyNote) => {
    setEditingNote(note);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const openDeleteConfirm = (note: StickyNote) => {
    setNoteToDelete(note);
  };

  const closeDeleteConfirm = () => {
    setNoteToDelete(null);
    setDeleting(false);
  };

  const handleConfirmDelete: () => Promise<void> = async () => {
    if (!noteToDelete) return;
    if (!userId) {
      toast.error("User not logged in");
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch("/api/sticky-notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noteToDelete._id, userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Delete failed");
      }

      setNotes((prev) => prev.filter((n) => n._id !== noteToDelete._id));
      toast.success("Sticky note deleted");
      closeDeleteConfirm();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to delete note");
      setDeleting(false);
    }
  };

  const computeNoteBoxTotal = (note: StickyNote) => {
    return note.items.reduce((sum, it) => {
      if (it.unit !== "box") return sum;
      const q = Number(it.quantity);
      if (!Number.isFinite(q) || q <= 0) return sum;
      return sum + q;
    }, 0);
  };

  const handleNoteSaved = (newNote: StickyNote) => {
    setNotes(prev => {
      const exists = prev.some(n => n._id === newNote._id);
      if (exists) {
        return prev.map(n => n._id === newNote._id ? newNote : n);
      } else {
        return [newNote, ...prev];
      }
    });
    closeModal();
  };

  const isDeliveryPartnerNote = (note: StickyNote) => {
    return !!note.deliveryPartnerId;
  };

  // ========= NEW: CREATE BILL FROM STICKY NOTE =========
  const handleCreateBill = (note: StickyNote) => {
    try {
      // Find the customer from the customers list
      const customer = customers.find(
        c => c._id === note.customerId ||
        (c.name.toLowerCase() === note.customerName.toLowerCase() &&
         c.shopName.toLowerCase() === note.shopName.toLowerCase())
      );

      // Prepare billing data with safe property access
      const billData = {
        customerId: customer?._id || note.customerId,
        customerName: note.customerName,
        shopName: note.shopName,
        address: (customer as any)?.address || (customer as any)?.shopAddress || "",
        contact: (customer as any)?.contact || (customer as any)?.contacts?.[0] || "",
        items: note.items.map(item => {
          // Find matching product to get price
          const product = products.find(
            p => p._id === item.productId ||
            p.name.toLowerCase() === item.productName.toLowerCase()
          );

          return {
            productId: item.productId || product?._id,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit || product?.unit || "box",
            price: product?.sellingPrice || 0,
            total: (product?.sellingPrice || 0) * item.quantity,
            free: false,
          };
        }),
        stickyNoteId: note._id, // Reference to track which sticky note was used
      };

      // Store in sessionStorage to pass to billing page
      sessionStorage.setItem("billFromStickyNote", JSON.stringify(billData));

      // Navigate to billing page
      router.push("/dashboard/billing");

      toast.success("Opening billing page with sticky note data...");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to create bill from sticky note");
    }
  };

  // ========= RENDER =========
  return (
    <>
      {/* Google Font for handwritten style */}
      <link
        href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap"
        rel="stylesheet"
      />

      {/* Full-Width Sticky Notes Panel */}
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          {/* Title and Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <StickyIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 flex-shrink-0" />
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-900">
                  Phone Orders / Sticky Notes
                </h2>
                <p className="text-xs sm:text-sm text-amber-800/80 mt-0.5">
                  Quick phone order capture for fast billing later
                </p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add New Sticky Note
            </button>
          </div>

          {/* Search Bar and Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by shop, customer, or product name..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none bg-white placeholder-gray-400"
              />
            </div>

            {filteredNotes.length > 0 && (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-lg border border-amber-300 hover:bg-amber-50 transition-colors whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showAll ? `Show Pages (${filteredNotes.length})` : `View All (${filteredNotes.length})`}
                </button>

                <span className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">
                  {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {loadingNotes ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs sm:text-sm text-gray-600">Loading sticky notes...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center bg-amber-50/50 rounded-xl border-2 border-dashed border-amber-200">
            <StickyIcon className="w-12 h-12 sm:w-16 sm:h-16 text-amber-300 mb-3 sm:mb-4" />
            <p className="text-base sm:text-lg font-medium text-amber-900 mb-2">
              {searchTerm ? "No matching sticky notes" : "No sticky notes yet"}
            </p>
            <p className="text-xs sm:text-sm text-amber-700/80 max-w-md">
              {searchTerm
                ? "Try adjusting your search terms or clear the search to see all notes"
                : "Start capturing phone orders by clicking the 'Add New Sticky Note' button above"}
            </p>
          </div>
        ) : (
          <>
            {/* Notes Grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
              {paginatedNotes.map((note, index) => {
                const boxTotal = computeNoteBoxTotal(note);
                const tiltClass = index % 3 === 0 ? "hover:rotate-[-2deg]" : index % 3 === 1 ? "hover:rotate-[2deg]" : "hover:rotate-[-1deg]";
                const isFromDelivery = isDeliveryPartnerNote(note);

                return (
                  <div
                    key={note._id}
                    className={`relative ${
                      isFromDelivery
                        ? "bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100"
                        : "bg-gradient-to-br from-yellow-100 via-yellow-50 to-amber-100"
                    } rounded-sm px-4 sm:px-5 py-5 sm:py-6 pt-8 sm:pt-10 flex flex-col gap-2 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_8px_10px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15),0_15px_25px_-5px_rgba(0,0,0,0.1)] transition-all duration-300 ${tiltClass} group border-t-4 ${
                      isFromDelivery ? "border-t-blue-400" : "border-t-amber-400"
                    }`}
                    style={{
                      transform: `rotate(${index % 3 === 0 ? '-1' : index % 3 === 1 ? '1' : '-0.5'}deg)`,
                    }}
                  >
                    {/* Realistic Push Pin */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                      <div className="relative">
                        {/* Pin Head (circular top) */}
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${
                          isFromDelivery ? "bg-blue-500" : "bg-red-500"
                        } shadow-lg flex items-center justify-center`}>
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${
                            isFromDelivery ? "bg-blue-400" : "bg-red-400"
                          }`} />
                        </div>
                        {/* Pin Needle (small shadow below) */}
                        <div className={`absolute top-5 left-1/2 -translate-x-1/2 w-0.5 h-2 ${
                          isFromDelivery ? "bg-blue-600/40" : "bg-red-600/40"
                        } blur-[1px]`} />
                      </div>
                    </div>

                    {/* Paper texture overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-sm"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          0deg,
                          transparent,
                          transparent 2px,
                          rgba(0,0,0,0.03) 2px,
                          rgba(0,0,0,0.03) 4px
                        )`
                      }}
                    />

                    {/* Delivery Partner Badge */}
                    {isFromDelivery && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1.5 sm:p-2 shadow-md z-10 border-2 border-white">
                        <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                    )}

                    {/* Header: Shop & Customer */}
                    <div className="flex items-start justify-between gap-2 mt-1 sm:mt-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm sm:text-base font-bold truncate ${
                          isFromDelivery ? "text-blue-900" : "text-gray-800"
                        }`} title={note.shopName}
                          style={{ fontFamily: "'Patrick Hand', 'Comic Sans MS', cursive" }}>
                          {note.shopName}
                        </p>
                        <p className={`text-xs sm:text-sm truncate ${
                          isFromDelivery ? "text-blue-700" : "text-gray-700"
                        }`} title={note.customerName}
                          style={{ fontFamily: "'Patrick Hand', 'Comic Sans MS', cursive" }}>
                          {note.customerName}
                        </p>
                        {isFromDelivery && (
                          <p className="text-[9px] sm:text-[10px] text-blue-600 flex items-center gap-1 mt-0.5">
                            <Truck className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                            Delivery Partner
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 bg-white/60 px-2 py-1 rounded-md shadow-sm">
                        <p className={`text-[9px] sm:text-[10px] font-medium ${
                          isFromDelivery ? "text-blue-700" : "text-amber-700"
                        }`}>
                          Boxes
                        </p>
                        <p className={`text-lg sm:text-xl font-bold ${
                          isFromDelivery ? "text-blue-900" : "text-amber-900"
                        }`}
                          style={{ fontFamily: "'Patrick Hand', 'Comic Sans MS', cursive" }}>
                          {boxTotal}
                        </p>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className={`text-[10px] sm:text-xs ${
                      isFromDelivery ? "text-blue-800" : "text-gray-700"
                    } mb-1 flex-1 leading-relaxed`}
                      style={{ fontFamily: "'Patrick Hand', 'Comic Sans MS', cursive" }}>
                      <p className="font-medium mb-0.5">
                        {note.items.length} item{note.items.length > 1 ? "s" : ""}:
                      </p>
                      <ul className="space-y-0.5 max-h-12 sm:max-h-14 overflow-hidden">
                        {note.items.slice(0, 2).map((item, idx) => (
                          <li key={idx} className="truncate" title={`${item.productName} (${item.quantity})`}>
                            • {item.productName} ({item.quantity})
                          </li>
                        ))}
                        {note.items.length > 2 && (
                          <li className="italic font-medium">+ {note.items.length - 2} more...</li>
                        )}
                      </ul>
                    </div>

                    {/* Footer: Actions */}
                    <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-current/10">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => openEditModal(note)}
                          className={`flex-1 text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border font-medium transition-all ${
                            isFromDelivery
                              ? "border-blue-400 text-blue-900 bg-blue-100/80 hover:bg-blue-200 hover:scale-105"
                              : "border-amber-400 text-amber-900 bg-amber-100/80 hover:bg-amber-200 hover:scale-105"
                          }`}
                        >
                          View
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(note)}
                          className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 hover:scale-105 inline-flex items-center justify-center gap-1 transition-all font-medium"
                        >
                          <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          <span className="hidden sm:inline">Del</span>
                        </button>
                      </div>

                      {/* Create Bill Button */}
                      <button
                        onClick={() => handleCreateBill(note)}
                        className={`w-full text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 font-semibold transition-all inline-flex items-center justify-center gap-1.5 ${
                          isFromDelivery
                            ? "border-green-500 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-600 hover:scale-105"
                            : "border-green-500 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-600 hover:scale-105"
                        }`}
                      >
                        <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        Create Bill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {!showAll && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? "bg-amber-500 text-white shadow-md"
                            : "border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Info Footer */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[10px] sm:text-xs text-blue-800 leading-relaxed">
            <strong>📋 Tip:</strong> Click "Create Bill" to open the billing page with pre-filled data.
            After creating a proper bill from a sticky note, delete it to keep your workspace organized.
            Notes with a <Truck className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mx-0.5" /> truck icon were created by delivery partners.
          </p>
        </div>
      </div>

      {/* Sticky Note Modal */}
      {showModal && (
        <StickyNoteModal
          mode={editingNote ? "edit" : "create"}
          note={editingNote}
          products={products}
          customers={customers}
          userId={userId}
          onClose={closeModal}
          onSave={handleNoteSaved}
        />
      )}

      {/* Delete Confirm Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Delete Sticky Note?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              Are you sure you want to delete the sticky note for{" "}
              <span className="font-semibold text-gray-900">{noteToDelete.shopName}</span>?
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 mb-4">
              This action cannot be undone.
            </p>
            {isDeliveryPartnerNote(noteToDelete) && (
              <div className="mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-[10px] sm:text-xs text-blue-800 font-medium flex items-center gap-1.5">
                  <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  This note was created by a delivery partner
                </p>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={closeDeleteConfirm}
                className="px-4 py-2 sm:py-2.5 rounded-lg border border-gray-300 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 sm:py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-xs sm:text-sm font-medium text-white transition-colors shadow-sm"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" reverseOrder={false} />
    </>
  );
}
