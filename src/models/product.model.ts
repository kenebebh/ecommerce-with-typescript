import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: 0,
    },
    compareAtPrice: {
      type: Number, // Original price for showing discounts
      min: 0,
    },
    // INVENTORY MANAGEMENT - Core fields
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10, // Alert when stock falls below this
    },
    sku: {
      type: String, // Stock Keeping Unit - unique identifier
      unique: true,
      sparse: true, // Allows null values
    },
    // Category relationship
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // References the same Category model
      default: null,
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        altText: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // Product variants (optional - for sizes, colors, etc.)
    variants: [
      {
        name: String, // e.g., "Size", "Color"
        value: String, // e.g., "Large", "Red"
        price: Number, // Override main price if variant has different price
        stock: Number, // Override main stock
        sku: String,
      },
    ],
    brand: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    // Product status
    isActive: {
      type: Boolean,
      default: true, // Admin can deactivate without deleting
    },
    isFeatured: {
      type: Boolean,
      default: false, // For homepage featured products
    },
    // Metadata
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ["kg", "g", "lb", "oz"],
      },
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ["cm", "in"],
      },
    },
    // Analytics
    viewCount: {
      type: Number,
      default: 0,
    },
    salesCount: {
      type: Number,
      default: 0,
    },
    // Reviews (embedded or referenced)
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate slug from name
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
  }
  next();
});

// Virtual field to check if product is low in stock
productSchema.virtual("isLowStock").get(function () {
  return this.stock <= this.lowStockThreshold && this.stock > 0;
});

// Virtual field to check if product is out of stock
productSchema.virtual("isOutOfStock").get(function () {
  return this.stock === 0;
});

// Index for better query performance
productSchema.index({ name: "text", description: "text", tags: "text" }); // Text search
productSchema.index({ category: 1, subcategory: 1 }); // Category filtering
productSchema.index({ price: 1 }); // Price sorting
productSchema.index({ createdAt: -1 }); // Recent products

export default mongoose.model("Product", productSchema);
