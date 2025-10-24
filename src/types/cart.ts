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
  createdAt: Date;
  updatedAt: Date;

  // Virtual fields
  totalItems: number;
  subtotal: number;

  //methods
  addItem(
    productId: Types.ObjectId | string,
    quantity: number,
    price: number
  ): Promise<ICart>;
  updateItemQuantity(
    productId: Types.ObjectId | string,
    quantity: number
  ): Promise<ICart>;
  removeItem(productId: Types.ObjectId | string): Promise<ICart>;
  clearCart(): Promise<ICart>;
  hasProduct(productId: Types.ObjectId | string): boolean;
  getItemQuantity(productId: Types.ObjectId | string): number;
}
