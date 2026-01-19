// src/app/dashboard/sticky-notes.tsx

"use client";

import { useEffect, useState } from "react";
import {
  StickyNote as StickyIcon,
  Plus,
  Trash2,
  Truck, // ✅ Icon for delivery partner indicator
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
  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<StickyNote | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

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

  // ========= HELPERS =========
  const openCreateModal = () => {
    setEditingNote(null);
    setShowModal(true);
  };

  const openEditModal = (note: StickyNote) => {
    // ✅ MANAGER CAN EDIT ALL NOTES (no restriction)
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

  // ✅ Check if note was created by delivery partner
  const isDeliveryPartnerNote = (note: StickyNote) => {
    return !!note.deliveryPartnerId;
  };

  // ========= RENDER =========
  return (
    <>
      {/* Sticky Notes Panel */}
      <aside className="w-full lg:w-[40%] lg:min-w-[280px] bg-[#fff9e6] rounded-xl shadow-md border border-amber-200 p-4 lg:p-5 flex flex-col max-h-[500px] lg:max-h-[calc(100vh-7rem)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <StickyIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
            <h2 className="font-semibold text-amber-900 text-sm sm:text-base">
              Phone Orders / Sticky Notes
            </h2>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs sm:text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors w-full sm:w-auto"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            Add Sticky
          </button>
        </div>

        <p className="text-[10px] sm:text-[11px] text-amber-800/80 mb-3">
          When someone calls and gives order, click &ldquo;Add Sticky&rdquo;, fill quickly and save. View / edit / delete from below.
        </p>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loadingNotes ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-xs text-amber-700">Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <StickyIcon className="w-12 h-12 text-amber-300 mb-2" />
              <p className="text-xs text-amber-700/80">
                No sticky notes yet. Start by adding one.
              </p>
            </div>
          ) : (
            notes.map((note, index) => {
              const boxTotal = computeNoteBoxTotal(note);
              const tilt =
                index % 2 === 0 ? "rotate-[-1.5deg]" : "rotate-[1.5deg]";
              const isFromDelivery = isDeliveryPartnerNote(note);
              
              return (
                <div
                  key={note._id}
                  className={`relative border ${
                    isFromDelivery 
                      ? "border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100" 
                      : "border-amber-300 bg-gradient-to-br from-amber-100 to-amber-200"
                  } rounded-xl px-3 py-3 flex flex-col gap-1 shadow-lg ${tilt} hover:-translate-y-1 transition-transform`}
                >
                  {/* Pin on top */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <div className={`w-6 sm:w-7 h-1.5 rounded-full ${
                      isFromDelivery ? "bg-blue-300" : "bg-amber-300"
                    } shadow-sm`} />
                  </div>

                  {/* ✅ Delivery Partner Indicator */}
                  {isFromDelivery && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1 shadow-md">
                      <Truck className="w-3 h-3" />
                    </div>
                  )}

                  {/* Header: Shop & Customer */}
                  <div className="flex items-start justify-between gap-2 mt-1">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${
                        isFromDelivery ? "text-blue-900" : "text-amber-900"
                      }`}>
                        {note.shopName}
                      </p>
                      <p className={`text-[11px] truncate ${
                        isFromDelivery ? "text-blue-800" : "text-amber-800"
                      }`}>
                        {note.customerName}
                      </p>
                      {/* ✅ Show delivery partner tag */}
                      {isFromDelivery && (
                        <p className="text-[9px] text-blue-600 flex items-center gap-1 mt-0.5">
                          <Truck className="w-2.5 h-2.5" />
                          Delivery Partner
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-[10px] ${
                        isFromDelivery ? "text-blue-700" : "text-amber-700"
                      }`}>
                        Total Boxes
                      </p>
                      <p className={`text-xs font-semibold ${
                        isFromDelivery ? "text-blue-900" : "text-amber-900"
                      }`}>
                        {boxTotal}
                      </p>
                    </div>
                  </div>

                  {/* Footer: Items count & Actions */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-1">
                    <p className={`text-[10px] ${
                      isFromDelivery ? "text-blue-800/80" : "text-amber-800/80"
                    }`}>
                      {note.items.length} item
                      {note.items.length > 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* ✅ MANAGER CAN EDIT ALL NOTES - no disabled state */}
                      <button
                        onClick={() => openEditModal(note)}
                        className={`text-[10px] sm:text-[11px] px-2 py-1 rounded-full border ${
                          isFromDelivery
                            ? "border-blue-400 text-blue-900 bg-blue-100/80 hover:bg-blue-200"
                            : "border-amber-400 text-amber-900 bg-amber-100/80 hover:bg-amber-200"
                        } transition-colors flex-1 sm:flex-initial`}
                      >
                        View / Edit
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(note)}
                        className={`text-[10px] sm:text-[11px] px-2 py-1 rounded-full border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 inline-flex items-center justify-center gap-1 transition-colors flex-1 sm:flex-initial`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Delete</span>
                        <span className="sm:hidden">Del</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-3 text-[9px] sm:text-[10px] text-amber-800/80 leading-relaxed">
          Tip: After converting this sticky note into a final bill, delete it from here to keep this area clean.
          {/* ✅ Info about delivery partner notes */}
          <span className="block mt-1 text-blue-700">
            <Truck className="w-2.5 h-2.5 inline mr-1" />
            Notes with truck icon were created by delivery partners.
          </span>
        </p>
      </aside>

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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-gray-800">
                Delete Sticky Note?
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Are you sure you want to delete this sticky note for{" "}
              <span className="font-semibold">{noteToDelete.shopName}</span>?{" "}
              This action cannot be undone.
              {/* ✅ Info for delivery partner notes */}
              {isDeliveryPartnerNote(noteToDelete) && (
                <span className="block mt-2 text-blue-700 font-medium">
                  <Truck className="w-3 h-3 inline mr-1" />
                  This note was created by a delivery partner.
                </span>
              )}
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={closeDeleteConfirm}
                className="w-full sm:w-auto px-4 py-2 rounded-md border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="w-full sm:w-auto px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-xs text-white transition-colors"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" reverseOrder={false} />
    </>
  );
}