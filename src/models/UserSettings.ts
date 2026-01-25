// icecream-inventory/src/models/UserSettings.ts

import { Schema, model, models, Document } from "mongoose";

export interface IUserSettings extends Document {
  userId: string;
  categories: string[];
  units: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: String, required: true, unique: true },
    categories: { 
      type: [String], 
      default: ["Cups", "Family Pack", "Cone", "Candybar", "Tub"] 
    },
    units: { 
      type: [String], 
      default: ["ml", "L", "gm", "kg", "piece", "box"] 
    },
  },
  { timestamps: true }
);

const UserSettings = models.UserSettings || model<IUserSettings>("UserSettings", UserSettingsSchema);

export default UserSettings;