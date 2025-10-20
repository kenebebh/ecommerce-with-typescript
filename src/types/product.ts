import { Document } from "mongoose";

export interface IInventory {
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
}

// Interface for individual image
export interface IProductImage {
  public_id: string;
  secure_url: string;
  asset_id: string;
  format?: string;
  width?: number;
  height?: number;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  images: IProductImage[];
  isActive: boolean;
  inventory: IInventory;
  createdAt: Date;
  updatedAt: Date;

  // Virtual fields
  availableQuantity: number;
  isLowStock: boolean;

  hasSufficientStock(quantity: number): boolean;
  findLowStock(): Promise<IProduct[]>;
  reserveInventory(quantity: number): Promise<void>;
  releaseInventory(quantity: number): Promise<void>;
  deductInventory(quantity: number): Promise<void>;
}
