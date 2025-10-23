import mongoose, { Schema } from "mongoose";
import type { ICategory } from "../types/category.ts";
import { generateSlug } from "../utils/generateSlug.ts";

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    image: {
      public_id: {
        type: String,
        default: null,
      },
      secure_url: {
        type: String,
        default: null,
      },
      asset_id: {
        type: String,
        default: null,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to get all subcategories
categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory",
});

// Virtual to count products in this category
categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true,
});

// Method to check if category is a main category (has no parent)
categorySchema.methods.isMainCategory = function (): boolean {
  return !this.parentCategory;
};

categorySchema.pre("save", function (next) {
  // Check if the product is new OR if the name was modified
  if (this.isModified("name") || this.isNew) {
    this.slug = generateSlug(this.name);
    // NOTE: For advanced usage, you might need extra logic here to ensure
    // the generated slug is globally unique by checking the database (e.g., appending a number).
  }
  next();
});

// Method to get full category path (e.g., "Electronics > Laptops")
categorySchema.methods.getFullPath = async function (): Promise<string> {
  if (!this.parentCategory) {
    return this.name;
  }

  const parent = await Category.findById(this.parentCategory);
  if (!parent) {
    return this.name;
  }

  return `${parent.name} > ${this.name}`;
};

// Indexes
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ isActive: 1 });

// Prevent circular reference (category can't be its own parent)
categorySchema.pre("save", async function (next) {
  if (
    this.parentCategory &&
    this.parentCategory.toString() === this._id.toString()
  ) {
    throw new Error("Category cannot be its own parent");
  }
  next();
});

// Prevent deleting category if it has subcategories or products
categorySchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    // Check for subcategories
    const subcategoryCount = await Category.countDocuments({
      parentCategory: this._id,
    });

    if (subcategoryCount > 0) {
      throw new Error(
        `Cannot delete category with ${subcategoryCount} subcategories. Please delete or reassign subcategories first.`
      );
    }

    // Check for products
    const Product = mongoose.model("Product");
    const productCount = await Product.countDocuments({ category: this._id });

    if (productCount > 0) {
      throw new Error(
        `Cannot delete category with ${productCount} products. Please reassign or delete products first.`
      );
    }
  }
);

const Category = mongoose.model<ICategory>("Category", categorySchema);

export default Category;
