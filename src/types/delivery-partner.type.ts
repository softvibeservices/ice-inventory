// src/types/delivery-partner.type.ts

import { Types } from "mongoose";

export interface DeliveryPartnerLean {
  _id: Types.ObjectId;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
}
