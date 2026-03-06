// ✨ NEW FILE: src/services/serialNumber.service.ts
import Counter from "@/models/Counter";
import mongoose from "mongoose";

/**
 * Atomically increments and returns the next serial number for a user.
 *
 * Format: YYMMXXXX
 *   YY   = last 2 digits of year  (e.g. 25 for 2025)
 *   MM   = zero-padded month      (e.g. 02 for February)
 *   XXXX = zero-padded sequence   (e.g. 0001, 0002 … 9999)
 *
 * Example: "25020001", "25020002", …
 *
 * Uses MongoDB findOneAndUpdate with $inc + upsert so concurrent requests
 * can never receive the same sequence number (no race condition).
 */
export async function getNextSerialNumber(
  userId: string | mongoose.Types.ObjectId
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear() % 100; // last 2 digits  e.g. 25
  const month = now.getMonth() + 1;     // 1-based month  e.g. 2

  const userObjectId =
    typeof userId === "string"
      ? new mongoose.Types.ObjectId(userId)
      : userId;

  // ✅ Atomic increment — safe under concurrent requests
  const counter = await Counter.findOneAndUpdate(
    { userId: userObjectId, year, month },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true }
  );

  // Format: YYMMXXXX  →  "25020001"
  return (
    year.toString().padStart(2, "0") +
    month.toString().padStart(2, "0") +
    counter.sequence.toString().padStart(4, "0")
  );
}