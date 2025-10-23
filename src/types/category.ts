import { Document, Types } from "mongoose";

export interface ICategoryImage {
  public_id: string | null;
  secure_url: string | null;
  asset_id: string | null;
}

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  parentCategory?: Types.ObjectId | ICategory;
  image?: ICategoryImage;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  subcategories?: ICategory[];
  productCount?: number;
}
