import { Document, Types } from "mongoose";

// TypeScript interfaces
export interface IOrderItem {
  productId: Types.ObjectId;
  name: string; // Snapshot
  price: number; // Snapshot
  quantity: number;
  image: string; // First product image
}

export interface IShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

export interface IPricing {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

export interface IPaymentInfo {
  method: "paystack" | "card" | "bank_transfer";
  status: "pending" | "completed" | "failed" | "refunded";
  transactionId?: string;
  reference: string; // Paystack reference
  paidAt?: Date;
}

export interface IOrderTimeline {
  status: string;
  timestamp: Date;
  note?: string;
}

export type OrderStatus =
  | "pending" // Order created, awaiting payment
  | "confirmed" // Payment successful
  | "processing" // Order being prepared
  | "shipped" // Order dispatched
  | "delivered" // Order received by customer
  | "cancelled" // Order cancelled
  | "failed"; // Payment failed

export interface IOrder extends Document {
  orderNumber: string;
  userId: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  pricing: IPricing;
  status: OrderStatus;
  payment: IPaymentInfo;
  timeline: IOrderTimeline[];
  createdAt: Date;
  updatedAt: Date;
}
