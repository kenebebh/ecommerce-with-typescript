import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Order from "../models/order.model.ts";
import Cart from "../models/cart.model.ts";
import Product from "../models/product.model.ts";

export class OrderController {
  /**
   * Create order from cart (Checkout - Step 1)
   * This creates the order and reserves inventory
   * Payment initialization happens in payment controller
   */
  static async createOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user?._id;
      const { shippingAddress } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      // Get user's cart
      const cart = await Cart.findOne({ userId }).populate("items.productId");

      if (!cart || cart.items.length === 0) {
        res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
        return;
      }

      // Validate all items
      const orderItems = [];
      let subtotal = 0;

      for (const item of cart.items) {
        const product = item.productId as any;

        // Check if product exists and is active
        if (!product || !product.isActive) {
          await session.abortTransaction();
          res.status(400).json({
            success: false,
            message: `Product ${product?.name || "unknown"} is not available`,
          });
          return;
        }

        // Check stock availability
        if (!product.hasSufficientStock(item.quantity)) {
          await session.abortTransaction();
          res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Only ${product.availableQuantity} available`,
          });
          return;
        }

        // Reserve inventory (within transaction)
        await Product.findByIdAndUpdate(
          product._id,
          { $inc: { "inventory.reserved": item.quantity } }, //increment inventory.reserved by item.quantity
          { session }
        );

        // Create order item with snapshot
        orderItems.push({
          productId: product._id,
          name: product.name,
          price: product.price, // Use current price, not cart price
          quantity: item.quantity,
          image: product.images[0]?.secure_url || "",
        });

        subtotal += product.price * item.quantity;
      }

      // Calculate pricing
      const shipping = subtotal >= 10000 ? 0 : 1500; // Free shipping over ₦10,000
      const tax = 0; // Adjust based on your tax rules
      const discount = 0; // Implement discount logic later
      const total = subtotal + shipping + tax - discount;

      // Generate payment reference
      const reference = Order.generatePaymentReference();

      // Create order
      const [order] = await Order.create(
        [
          {
            userId,
            items: orderItems,
            shippingAddress,
            pricing: {
              subtotal,
              shipping,
              tax,
              discount,
              total,
            },
            payment: {
              method: "paystack",
              status: "pending",
              reference,
            },
          },
        ],
        { session }
      );

      // Commit transaction
      await session.commitTransaction();

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all orders for logged-in user
   */
  static async getUserOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const orders = await Order.find({ userId })
        .sort({ createdAt: -1 })
        .select("-timeline"); // Exclude timeline for list view

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single order by ID
   */
  static async getOrderById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?._id;
      const { orderId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const order = await Order.findOne({
        _id: orderId,
        userId, // Ensure user can only see their own orders
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order by order number
   */
  static async getOrderByNumber(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?._id;
      const { orderNumber } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const order = await Order.findOne({
        orderNumber,
        userId,
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel order (only if pending or failed)
   */
  static async cancelOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user?._id;
      const { orderId } = req.params;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const order = await Order.findOne({ _id: orderId, userId });

      if (!order) {
        await session.abortTransaction();
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      if (!order.canBeCancelled()) {
        await session.abortTransaction();
        res.status(400).json({
          success: false,
          message: "Order cannot be cancelled at this stage",
        });
        return;
      }

      // Release reserved inventory
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { "inventory.reserved": -item.quantity } },
          { session }
        );
      }

      // Cancel order
      await order.cancelOrder(reason);

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: "Order cancelled successfully",
        data: order,
      });
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all orders (Admin only)
   */
  static async getAllOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Pagination is handled by middleware
      res.status(200).json({
        paginatedData: res.locals.paginatedResults,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update order status (Admin only)
   */
  static async updateOrderStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { orderId } = req.params;
      const { status, note } = req.body;

      const order = await Order.findById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      await order.updateStatus(status, note);

      res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order statistics (Admin only)
   */
  static async getOrderStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$pricing.total" },
          },
        },
      ]);

      const totalOrders = await Order.countDocuments();
      const totalRevenue = await Order.aggregate([
        {
          $match: { status: "confirmed" },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$pricing.total" },
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          statusBreakdown: stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default OrderController;
