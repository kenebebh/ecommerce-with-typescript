import mongoose, { Schema, Model, Types, SchemaTypes } from "mongoose";
import type { ICart, ICartItem } from "../types/cart.ts";

// Cart Item sub-schema
const cartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: SchemaTypes.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Main Cart schema
const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One cart per user
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: Total quantity of items in cart
cartSchema.virtual("totalItems").get(function (this: ICart) {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual: Calculate subtotal
cartSchema.virtual("subtotal").get(function (this: ICart) {
  return this.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
});

// Indexes
cartSchema.index({ "items.productId": 1 }); // Fast product lookup in cart
cartSchema.index({ updatedAt: 1 }); // For finding abandoned carts

// Static method: Find or create cart for user
cartSchema.statics.findOrCreateCart = async function (
  userId: string | Types.ObjectId
): Promise<ICart> {
  let cart = await this.findOne({ userId }).populate({
    path: "items.productId",
    select: "name slug price images inventory isActive",
  });

  // To see the populated data properly in console:
  if (cart) {
    console.log("cart items:", JSON.stringify(cart.items, null, 2));
  }

  if (!cart) {
    cart = await this.create({ userId, items: [] });
  }

  return cart;
};

// Instance method: Add item to cart
cartSchema.methods.addItem = async function (
  productId: Types.ObjectId | string,
  quantity: number,
  price: number
): Promise<void> {
  // const existingItemIndex = this.items.findIndex(
  //   (item: ICartItem) => item.productId.toString() === productId.toString()
  // );

  // Depopulate items to work with ObjectIds only
  const items = this.items.map((item: any) => ({
    ...item,
    productId: item.productId._id || item.productId,
  }));

  const existingItemIndex = items.findIndex(
    (item: ICartItem) => item.productId.toString() === productId.toString()
  );

  if (existingItemIndex > -1) {
    // Item already exists, update quantity
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].addedAt = new Date(); // Update timestamp
  } else {
    // Add new item
    this.items.push({
      productId: productId as Types.ObjectId,
      quantity,
      price,
      addedAt: new Date(),
    });
  }

  return await this.save();
};

// Instance method: Update item quantity
cartSchema.methods.updateItemQuantity = async function (
  productId: Types.ObjectId | string,
  quantity: number
): Promise<ICart> {
  const itemIndex = this.items.findIndex(
    (item: ICartItem) => item.productId.toString() === productId.toString()
  );

  if (itemIndex === -1) {
    throw new Error("Item not found in cart");
  }

  if (quantity <= 0) {
    // Remove item if quantity is 0 or negative
    this.items.splice(itemIndex, 1);
  } else {
    this.items[itemIndex].quantity = quantity;
  }

  return await this.save();
};

// Instance method: Remove item from cart
cartSchema.methods.removeItem = async function (
  productId: Types.ObjectId | string
): Promise<ICart> {
  this.items = this.items.filter(
    (item: ICartItem) => item.productId.toString() !== productId.toString()
  );

  return await this.save();
};

// Instance method: Clear cart
cartSchema.methods.clearCart = async function (): Promise<ICart> {
  this.items = [];
  return await this.save();
};

// Instance method: Check if product is in cart
cartSchema.methods.hasProduct = function (
  productId: Types.ObjectId | string
): boolean {
  return this.items.some(
    (item: ICartItem) => item.productId.toString() === productId.toString()
  );
};

// Instance method: Get item quantity
cartSchema.methods.getItemQuantity = function (
  productId: Types.ObjectId | string
): number {
  const item = this.items.find(
    (item: ICartItem) => item.productId.toString() === productId.toString()
  );
  return item ? item.quantity : 0;
};

// Add custom statics to the model interface
interface ICartModel extends Model<ICart> {
  findOrCreateCart(userId: string | Types.ObjectId): Promise<ICart>;
}

const Cart = mongoose.model<ICart, ICartModel>("Cart", cartSchema);

export default Cart;
