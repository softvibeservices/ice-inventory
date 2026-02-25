// src/types/delivery-partner.type.ts


export interface DeliveryPartnerLean {
  _id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
}
