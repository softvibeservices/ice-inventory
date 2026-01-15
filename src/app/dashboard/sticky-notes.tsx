// ice-inventory\src\app\dashboard\sticky-notes.tsx


"use client";

import { useEffect, useState } from "react";
import {
  StickyNote as StickyIcon,
  Plus,
  Trash2,
  Pin,
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

  // ========= RENDER =========
  return (
    <>
      {/* Sticky Notes Panel */}
      <aside className="w-[40%] min-w-[260px] bg-[#fff9e6] rounded-xl shadow-md border border-amber-200 p-4 lg:p-5 flex flex-col max-h-[calc(100vh-7rem)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StickyIcon className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-amber-900 text-sm lg:text-base">
              Phone Orders / Sticky Notes
            </h2>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs lg:text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Sticky
          </button>
        </div>

        <p className="text-[11px] text-amber-800/80 mb-3">
          When someone calls and gives order, click &ldquo;Add Sticky&rdquo;, fill quickly and save. View / edit / delete from below.
        </p>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loadingNotes ? (
            <p className="text-xs text-amber-700">Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="text-xs text-amber-700/80">
              No sticky notes yet. Start by adding one.
            </p>
          ) : (
            notes.map((note, index) => {
              const boxTotal = computeNoteBoxTotal(note);
              const tilt =
                index % 2 === 0 ? "rotate-[-1.5deg]" : "rotate-[1.5deg]";
              return (
                <div
                  key={note._id}
                  className={`relative border border-amber-300 rounded-xl px-3 py-3 flex flex-col gap-1 bg-gradient-to-br from-amber-100 to-amber-200 shadow-lg ${tilt} hover:-translate-y-1 transition-transform`}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <div className="w-7 h-1.5 rounded-full bg-amber-300 shadow-sm" />
                  </div>

                  <div className="flex items-start justify-between gap-2 mt-1">
                    <div>
                      <p className="text-xs font-semibold text-amber-900">
                        {note.shopName}
                      </p>
                      <p className="text-[11px] text-amber-800">
                        {note.customerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-amber-700">
                        Total Boxes
                      </p>
                      <p className="text-xs font-semibold text-amber-900">
                        {boxTotal}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[10px] text-amber-800/80">
                      {note.items.length} item
                      {note.items.length > 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(note)}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-amber-400 text-amber-900 bg-amber-100/80 hover:bg-amber-200"
                      >
                        View / Edit
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(note)}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-3 text-[10px] text-amber-800/80">
          Tip: After converting this sticky note into a final bill, delete it from here to keep this area clean.
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-red-600" />
              <h3 className="text-sm font-semibold text-gray-800">
                Delete Sticky Note?
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Are you sure you want to delete this sticky note for{" "}
              <span className="font-semibold">{noteToDelete.shopName}</span>?{" "}
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeDeleteConfirm}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-xs text-white"
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
