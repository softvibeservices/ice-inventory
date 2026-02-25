// src/models/UserSettings.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  categories: string[];
  units: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    categories: {
      type: [String],
      default: ["Cups", "Family Pack", "Cone", "Candybar", "Tub"],
    },
    units: {
      type: [String],
      default: ["ml", "L", "gm", "kg", "piece", "box"],
    },
  },
  { timestamps: true }
);

const UserSettings = models.UserSettings || model<IUserSettings>("UserSettings", UserSettingsSchema);

export default UserSettings;