import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Order from "../models/order.model.ts";
import Cart from "../models/cart.model.ts";
import Product from "../models/product.model.ts";
import PaystackService from "../services/paystackService.ts";

export class PaymentController {
  /**
   * Initialize payment for an order
   * This is called after order creation
   */
  static async initializePayment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { orderId } = req.body;
      const userId = req.user?._id;

      if (!req.user) {
        res.status(401);
        throw new Error("User not authenticated");
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      // Get order
      const order = await Order.findOne({ _id: orderId, userId });

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      // Check if order is already paid
      if (order.payment.status === "completed") {
        res.status(400).json({
          success: false,
          message: "Order has already been paid",
        });
        return;
      }

      // Check if order is cancelled or failed
      if (order.status === "cancelled" || order.status === "failed") {
        res.status(400).json({
          success: false,
          message: "Cannot pay for cancelled or failed order",
        });
        return;
      }

      // Initialize Paystack payment
      const paymentData = await PaystackService.initializePayment(
        req.user.email,
        order.pricing.total,
        order.payment.reference,
        {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          userId: userId.toString(),
        }
      );

      res.status(200).json({
        success: true,
        message: "Payment initialized successfully",
        data: {
          authorizationUrl: paymentData.data.authorization_url,
          accessCode: paymentData.data.access_code,
          reference: paymentData.data.reference,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify payment after user completes payment
   * This can be called from callback URL
   */
  static async verifyPayment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { reference } = req.params;

      if (!reference) {
        res.status(400);
        throw new Error("Payment reference is required");
      }

      // Verify payment with Paystack
      const verification = await PaystackService.verifyPayment(reference);

      if (!verification.status) {
        await session.abortTransaction();
        res.status(400).json({
          success: false,
          message: "Payment verification failed",
        });
        return;
      }

      const paymentData = verification.data;

      // Find order by payment reference
      const order = await Order.findOne({ "payment.reference": reference });

      if (!order) {
        await session.abortTransaction();
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      // Check if already processed
      if (order.payment.status === "completed") {
        await session.abortTransaction();
        res.status(200).json({
          success: true,
          message: "Payment already processed",
          data: order,
        });
        return;
      }

      // Check payment status
      if (paymentData.status === "success") {
        // Payment successful - update order and inventory
        await order.markAsPaid(paymentData.id.toString());

        // Deduct inventory and release reservation
        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.productId,
            {
              $inc: {
                "inventory.quantity": -item.quantity,
                "inventory.reserved": -item.quantity,
              },
            },
            { session }
          );
        }

        // Clear user's cart
        await Cart.findOneAndUpdate(
          { userId: order.userId },
          { items: [] },
          { session }
        );

        await session.commitTransaction();

        res.status(200).json({
          success: true,
          message: "Payment verified successfully",
          data: order,
        });
      } else {
        // Payment failed - release inventory reservation
        await order.markAsFailed(paymentData.gateway_response);

        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { "inventory.reserved": -item.quantity } },
            { session }
          );
        }

        await session.commitTransaction();

        res.status(400).json({
          success: false,
          message: "Payment failed",
          data: {
            order,
            reason: paymentData.gateway_response,
          },
        });
      }
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  /**
   * Paystack webhook handler
   * CRITICAL: This is where Paystack notifies you about payment status
   */
  static async handleWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verify webhook signature
      const signature = req.headers["x-paystack-signature"] as string;
      const payload = JSON.stringify(req.body);

      if (!PaystackService.verifyWebhookSignature(payload, signature)) {
        await session.abortTransaction();
        res.status(401).json({
          success: false,
          message: "Invalid signature",
        });
        return;
      }

      const event = req.body;

      console.log("event from paystack", event);

      // Handle different event types
      switch (event.event) {
        case "charge.success":
          await PaymentController.handleSuccessfulPayment(event.data, session);
          break;

        case "charge.failed":
          await PaymentController.handleFailedPayment(event.data, session);
          break;

        case "transfer.success":
          // Handle successful refund
          console.log("Refund successful:", event.data);
          break;

        case "transfer.failed":
          // Handle failed refund
          console.log("Refund failed:", event.data);
          break;

        default:
          console.log("Unhandled webhook event:", event.event);
      }

      await session.commitTransaction();

      // Always respond with 200 to acknowledge receipt
      res.status(200).json({ success: true });
    } catch (error) {
      await session.abortTransaction();
      console.error("Webhook Error:", error);
      // Still return 200 to prevent Paystack from retrying
      res.status(200).json({ success: true });
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle successful payment (called by webhook)
   */
  private static async handleSuccessfulPayment(
    data: any,
    session: mongoose.ClientSession
  ): Promise<void> {
    const { reference } = data;

    const order = await Order.findOne({ "payment.reference": reference });

    if (!order) {
      console.error("Order not found for reference:", reference);
      return;
    }

    // Skip if already processed
    if (order.payment.status === "completed") {
      console.log("Payment already processed:", reference);
      return;
    }

    // Mark order as paid
    await order.markAsPaid(data.id.toString());

    // Deduct inventory and release reservation
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: {
            "inventory.quantity": -item.quantity,
            "inventory.reserved": -item.quantity,
          },
        },
        { session }
      );
    }

    // Clear cart
    await Cart.findOneAndUpdate(
      { userId: order.userId },
      { items: [] },
      { session }
    );

    console.log("Payment processed successfully:", reference);
  }

  /**
   * Handle failed payment (called by webhook)
   */
  private static async handleFailedPayment(
    data: any,
    session: mongoose.ClientSession
  ): Promise<void> {
    const { reference, gateway_response } = data;

    const order = await Order.findOne({ "payment.reference": reference });

    if (!order) {
      console.error("Order not found for reference:", reference);
      return;
    }

    // Skip if already failed
    if (order.payment.status === "failed") {
      console.log("Payment already marked as failed:", reference);
      return;
    }

    // Mark order as failed
    await order.markAsFailed(gateway_response);

    // Release inventory reservation
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { "inventory.reserved": -item.quantity } },
        { session }
      );
    }

    console.log("Payment marked as failed:", reference);
  }

  /**
   * Initiate refund (Admin only)
   * NOTE: Paystack refunds may need to be processed manually
   */
  static async initiateRefund(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { orderId } = req.params;
      const { amount, reason } = req.body;

      const order = await Order.findById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found",
        });
        return;
      }

      if (order.payment.status !== "completed") {
        res.status(400).json({
          success: false,
          message: "Cannot refund unpaid order",
        });
        return;
      }

      // Attempt to initiate refund with Paystack
      try {
        const refundAmount = amount || order.pricing.total;

        await PaystackService.initiateRefund({
          transaction: order.payment.transactionId!,
          amount: PaystackService.toKobo(refundAmount),
          merchant_note: reason,
        });

        // Update order status
        order.payment.status = "refunded";
        await order.updateStatus("cancelled", `Refunded: ${reason}`);

        res.status(200).json({
          success: true,
          message: "Refund initiated successfully",
          data: order,
        });
      } catch (error: any) {
        // If automatic refund fails, provide manual instructions
        res.status(200).json({
          success: true,
          message: error.message,
          instructions: [
            "1. Log in to Paystack Dashboard",
            "2. Go to Transactions",
            `3. Find transaction: ${order.payment.transactionId}`,
            "4. Click Refund",
            "5. Enter amount and reason",
            "6. Confirm refund",
          ],
          data: order,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment history for user
   */
  static async getPaymentHistory(
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
        .select("orderNumber payment pricing status createdAt");

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PaymentController;
