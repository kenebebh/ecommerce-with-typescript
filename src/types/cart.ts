import { Types } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  quantity: number;
  price: number;
  addedAt: Date;
}

export interface ICart {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  items: ICartItem[];
  totalItems: number;
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}
