import mongoose, { Schema, Model } from "mongoose";
import type {
  IOrder,
  IOrderItem,
  IShippingAddress,
  IPricing,
  IPaymentInfo,
  IOrderTimeline,
  OrderStatus,
} from "../types/order.ts";

// Order Item sub-schema
const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    image: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// Shipping Address sub-schema
const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
      default: "Nigeria",
    },
    postalCode: {
      type: String,
    },
  },
  { _id: false }
);

// Pricing sub-schema
const pricingSchema = new Schema<IPricing>(
  {
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// Payment Info sub-schema
const paymentInfoSchema = new Schema<IPaymentInfo>(
  {
    method: {
      type: String,
      enum: ["paystack", "card", "bank_transfer"],
      default: "paystack",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    transactionId: {
      type: String,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    paidAt: {
      type: Date,
    },
  },
  { _id: false }
);

// Timeline sub-schema
const timelineSchema = new Schema<IOrderTimeline>(
  {
    status: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
    },
  },
  { _id: false }
);

// Main Order schema
const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items: IOrderItem[]) {
          return items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "failed",
      ],
      default: "pending",
    },
    payment: {
      type: paymentInfoSchema,
      required: true,
    },
    timeline: {
      type: [timelineSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 }); // User order history
orderSchema.index({ status: 1, createdAt: -1 }); // Admin filtering
orderSchema.index({ createdAt: -1 }); // Recent orders

// Pre-save middleware: Generate order number
orderSchema.pre("save", async function (next) {
  if (this.isNew) {
    // Generate order number: ORD-YYYYMMDD-XXXXX
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // Count orders today to generate sequential number
    const todayStart = new Date(year, date.getMonth(), date.getDate());
    const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

    const count = await mongoose.model("Order").countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd },
    });

    const orderNum = String(count + 1).padStart(5, "0");
    this.orderNumber = `ORD-${year}${month}${day}-${orderNum}`;

    // Add initial timeline entry
    this.timeline.push({
      status: "pending",
      timestamp: new Date(),
      note: "Order created",
    });
  }
  next();
});

// Static method: Generate unique payment reference
orderSchema.statics.generatePaymentReference = function (): string {
  return `PAY-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)
    .toUpperCase()}`;
};

// Instance method: Update order status
orderSchema.methods.updateStatus = async function (
  status: OrderStatus,
  note?: string
): Promise<IOrder> {
  this.status = status;
  this.timeline.push({
    status,
    timestamp: new Date(),
    note,
  });

  return await this.save();
};

// Instance method: Mark as paid
orderSchema.methods.markAsPaid = async function (
  transactionId: string
): Promise<IOrder> {
  this.payment.status = "completed";
  this.payment.transactionId = transactionId;
  this.payment.paidAt = new Date();
  this.status = "confirmed";

  this.timeline.push({
    status: "confirmed",
    timestamp: new Date(),
    note: "Payment confirmed",
  });

  return await this.save();
};

// Instance method: Mark as failed
orderSchema.methods.markAsFailed = async function (
  reason?: string
): Promise<IOrder> {
  this.payment.status = "failed";
  this.status = "failed";

  this.timeline.push({
    status: "failed",
    timestamp: new Date(),
    note: reason || "Payment failed",
  });

  return await this.save();
};

// Instance method: Cancel order
orderSchema.methods.cancelOrder = async function (
  reason?: string
): Promise<IOrder> {
  if (this.status === "pending") {
    this.status = "cancelled";
    this.timeline.push({
      status: "cancelled",
      timestamp: new Date(),
      note: reason || "Order cancelled by user",
    });
    return await this.save();
  } else {
    throw new Error(
      "Cannot cancel order that is already confirmed, processed or shipped"
    );
  }
};

// Instance method: Check if order can be cancelled
orderSchema.methods.canBeCancelled = function (): boolean {
  return this.status === "pending";
};

// Add custom statics to the model interface
interface IOrderModel extends Model<IOrder> {
  generatePaymentReference(): string;
}

const Order = mongoose.model<IOrder, IOrderModel>("Order", orderSchema);

export default Order;
