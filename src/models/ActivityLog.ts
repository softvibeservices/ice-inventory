// src/models/ActivityLog.ts
import mongoose, { Schema, Document, models } from "mongoose";
import { ActivityActionType, ActivityCategory, ActorRole, Severity } from "@/types/activityLog";

/* =======================
   Interface (TypeScript)
======================= */

export interface IActivityLog extends Document {
  // Actor (WHO performed the action)
  actorId: mongoose.Types.ObjectId;
  actorRole: ActorRole;
  actorName: string;
  
  // Shop context (WHERE the action occurred)
  shopId: mongoose.Types.ObjectId;
  shopName: string;
  
  // Action (WHAT was done)
  actionType: ActivityActionType;
  actionCategory: ActivityCategory;
  
  // Contextual details
  details: any; // Type-safe union from activityLog.ts
  
  // Temporal (WHEN the action occurred)
  timestamp: Date;
  businessDate: Date; // Date at 00:00:00 for business day grouping
  
  // Metadata
  severity: Severity;
  ipAddress?: string;
  deviceInfo?: string;
  
  createdAt?: Date;
  updatedAt?: Date;
}

/* =======================
   Activity Log Schema
======================= */

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    // ═══════════════════════════════════════════════
    // ACTOR
    // ═══════════════════════════════════════════════
    actorId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    actorRole: { 
      type: String, 
      enum: ['admin', 'manager', 'delivery_partner'],
      required: true,
      index: true
    },
    actorName: { 
      type: String, 
      required: true 
    },
    
    // ═══════════════════════════════════════════════
    // SHOP CONTEXT
    // ═══════════════════════════════════════════════
    shopId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    shopName: { 
      type: String, 
      required: true 
    },
    
    // ═══════════════════════════════════════════════
    // ACTION
    // ═══════════════════════════════════════════════
    actionType: { 
      type: String, 
      enum: Object.values(ActivityActionType),
      required: true,
      index: true
    },
    actionCategory: { 
      type: String, 
      enum: ['inventory', 'sales', 'customer', 'delivery', 'finance'],
      required: true,
      index: true
    },
    
    // ═══════════════════════════════════════════════
    // DETAILS (Type-safe union stored as Mixed)
    // ═══════════════════════════════════════════════
    details: { 
      type: Schema.Types.Mixed, 
      required: true 
    },
    
    // ═══════════════════════════════════════════════
    // TEMPORAL
    // ═══════════════════════════════════════════════
    timestamp: { 
      type: Date, 
      default: Date.now,
      index: true
    },
    businessDate: { 
      type: Date, 
      required: true,
      index: true
    },
    
    // ═══════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════
    severity: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true
    },
    ipAddress: { 
      type: String 
    },
    deviceInfo: { 
      type: String 
    },
  },
  { 
    timestamps: true,
    collection: 'activity_logs'
  }
);

/* =======================
   Compound Indexes
======================= */

// Main query pattern: Admin panel - shop activities by date
ActivityLogSchema.index({ shopId: 1, businessDate: -1 });

// Super Admin: Platform-wide queries
ActivityLogSchema.index({ businessDate: -1, shopId: 1 });

// Category filtering
ActivityLogSchema.index({ shopId: 1, actionCategory: 1, businessDate: -1 });

// Severity filtering
ActivityLogSchema.index({ shopId: 1, severity: 1, businessDate: -1 });

// Action type queries
ActivityLogSchema.index({ shopId: 1, actionType: 1, businessDate: -1 });

// Order serial number lookup (sparse index)
ActivityLogSchema.index({ 'details.serialNumber': 1, businessDate: -1 }, { sparse: true });

// Customer name search (sparse index)
ActivityLogSchema.index({ 'details.customerName': 1, businessDate: -1 }, { sparse: true });

/* =======================
   Export Model
======================= */

const ActivityLog = models.ActivityLog || mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;