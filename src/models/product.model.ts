import mongoose, { Model, Schema } from "mongoose";

import type { IInventory, IProduct, IProductImage } from "../types/product.ts";
import { generateSlug } from "../utils/generateSlug.ts";

// Image sub-schema
const productImageSchema = new Schema<IProductImage>(
  {
    public_id: {
      type: String,
      required: true,
    },
    secure_url: {
      type: String,
      required: true,
    },
    asset_id: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      default: "jpg",
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
  },
  { _id: false }
);

// Inventory sub-schema
const inventorySchema = new Schema<IInventory>(
  {
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reserved: {
      type: Number,
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
  },
  { _id: false }
);

// Main Product schema
const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      enum: {
        values: ["electronics", "clothing", "books", "home", "sports", "other"],
        message: "{VALUE} is not a valid category",
      },
    },
    images: {
      type: [productImageSchema],
      validate: {
        validator: function (images: IProductImage[]) {
          return images.length > 0 && images.length <= 10; // Max 10 images
        },
        message: "Product must have between 1 and 10 images",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inventory: {
      type: inventorySchema,
      required: true,
      default: () => ({
        quantity: 0,
        reserved: 0,
        lowStockThreshold: 10,
      }),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field: availableQuantity inventory
productSchema.virtual("availableQuantity").get(function (this: IProduct) {
  return Math.max(0, this.inventory.quantity - this.inventory.reserved);
});

// Virtual field: is low stock
productSchema.virtual("isLowStock").get(function (this: IProduct) {
  return this.availableQuantity <= this.inventory.lowStockThreshold;
});

// Indexes for performance
productSchema.index({ name: "text" }); // Text search
productSchema.index({ category: 1, price: 1 }); // Filter by category and sort by price
productSchema.index({ slug: 1 }); // Fast slug lookup
productSchema.index({ isActive: 1 }); // Filter active products
productSchema.index({ "inventory.quantity": 1 }); // Stock queries

// Pre-save middleware: Generate slug from name using the utility function
productSchema.pre("save", function (next) {
  // Check if the product is new OR if the name was modified
  if (this.isModified("name") || this.isNew) {
    this.slug = generateSlug(this.name);
    // NOTE: For advanced usage, you might need extra logic here to ensure
    // the generated slug is globally unique by checking the database (e.g., appending a number).
  }
  next();
});

// Static method: Find products with low stock
productSchema.statics.findLowStock = function (): Promise<IProduct[]> {
  return this.aggregate([
    {
      $addFields: {
        availableQuantity: {
          $subtract: ["$inventory.quantity", "$inventory.reserved"],
        },
      },
    },
    {
      $match: {
        $expr: { $lte: ["$availableQuantity", "$inventory.lowStockThreshold"] },
        isActive: true,
      },
    },
  ]);
};

// Instance method: Check if product has sufficient stock
productSchema.methods.hasSufficientStock = function (
  quantity: number
): boolean {
  return this.availableQuantity >= quantity;
};

// Instance method: Reserve inventory
productSchema.methods.reserveInventory = async function (
  quantity: number
): Promise<void> {
  if (!this.hasSufficientStock(quantity)) {
    throw new Error("Insufficient stock availableQuantity");
  }

  this.inventory.reserved += quantity;

  this.inventory.reserved = this.inventory.reserved + quantity;
  await this.save();
};

// Instance method: Release reserved inventory
productSchema.methods.releaseInventory = async function (
  quantity: number
): Promise<void> {
  this.inventory.reserved = Math.max(0, this.inventory.reserved - quantity);
  await this.save();
};

// Instance method: Deduct inventory (after successful order)
productSchema.methods.deductInventory = async function (
  quantity: number
): Promise<void> {
  if (this.inventory.quantity < quantity) {
    throw new Error("Insufficient inventory to deduct");
  }

  this.inventory.quantity -= quantity;
  this.inventory.reserved = Math.max(0, this.inventory.reserved - quantity);
  await this.save();
};

// Add custom statics to the model interface
interface IProductModel extends Model<IProduct> {
  findLowStock(): Promise<IProduct[]>;
}

const Product = mongoose.model<IProduct, IProductModel>(
  "Product",
  productSchema
);

export default Product;

// FEature
// Inventory management built-in with quantity, reserved, and lowStockThreshold
// Virtual fields: availableQuantity (quantity - reserved) and isLowStock (auto-calculated)
// Auto-generated slug from product name for SEO-friendly URLs
// Instance methods for inventory operations:

// hasSufficientStock() - Check availability
// reserveInventory() - Reserve stock for pending orders
// releaseInventory() - Release reservation if order fails
// deductInventory() - Deduct after successful payment

// Static method: findLowStock() - Query all low stock products
// Indexes for fast queries (text search, category filtering, etc.)
