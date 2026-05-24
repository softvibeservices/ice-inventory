// src/types/activityLog.type.ts
// ─────────────────────────────────────────────────────────────────────────────
//  Frontend-facing types for the ActivityLog feature.
//  These mirror the server-side interfaces but are plain objects
//  (no Mongoose Document) so they are safe to use in React components.
// ─────────────────────────────────────────────────────────────────────────────

// Re-export the enums so the UI can import from one place
export {
  ActivityAction,
  ActivityCategory,
  type ActivityActionType,
  type ActivityCategoryType,
  type IActivityLogMeta,
} from "@/models/ActivityLog";

// ─────────────────────────────────────────────────────────────────────────────
//  Plain-object version of a log entry (as returned by the API via .lean())
// ─────────────────────────────────────────────────────────────────────────────

import type { ActivityActionType, ActivityCategoryType, IActivityLogMeta } from "@/models/ActivityLog";

export interface IActivityLogEntry {
  _id:        string;
  adminId:    string;

  actorId:    string;
  actorModel: "User" | "DeliveryPartner";
  actorName:  string;
  actorRole:  "manager" | "delivery_partner";

  action:     ActivityActionType;
  category:   ActivityCategoryType;

  /** Pre-rendered human-readable sentence — display this directly in the UI */
  message:    string;

  metadata:   IActivityLogMeta;

  createdAt:  string;   // ISO string (JSON serialised Date)
  updatedAt:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  API response shape from GET /api/activity-logs
// ─────────────────────────────────────────────────────────────────────────────

export interface IActivityLogsResponse {
  logs:       IActivityLogEntry[];
  total:      number;
  page:       number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Query params shape used when calling the API
// ─────────────────────────────────────────────────────────────────────────────

export interface IActivityLogQuery {
  page?:       number;
  limit?:      number;
  category?:   ActivityCategoryType;
  actorRole?:  "manager" | "delivery_partner";
  actorId?:    string;
  action?:     ActivityActionType;
  startDate?:  string;   // ISO string
  endDate?:    string;   // ISO string
}

// ─────────────────────────────────────────────────────────────────────────────
//  Category label map — for rendering filter tab labels in the UI
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<ActivityCategoryType, string> = {
  order:       "Orders",
  customer:    "Customers",
  product:     "Products",
  stock:       "Stock",
  bill:        "Bills",
  sticky_note: "Sticky Notes",
  delivery:    "Delivery",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Role label map
// ─────────────────────────────────────────────────────────────────────────────

export const ACTOR_ROLE_LABELS: Record<"manager" | "delivery_partner", string> = {
  manager:          "Manager",
  delivery_partner: "Delivery Partner",
};