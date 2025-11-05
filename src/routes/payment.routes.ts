import { Router } from "express";
import PaymentController from "../controllers/payment.controller.ts";
import { protect } from "../middleware/authMiddleware.ts";
import { adminOnly } from "../middleware/authMiddleware.ts";

const paymentRouter = Router();

// ========================================
// USER ROUTES (Authentication required)
// ========================================

/**
 * @route   POST /api/payments/initialize
 * @desc    Initialize payment for an order
 * @access  Private
 * @body    { orderId: string }
 */
paymentRouter.post("/initialize", protect, PaymentController.initializePayment);

/**
 * @route   GET /api/payments/verify/:reference
 * @desc    Verify payment after user completes payment
 * @access  Private
 * @note    This can also be called from frontend callback
 */
paymentRouter.get("/verifyPayment", protect, PaymentController.verifyPayment);

/**
 * @route   GET /api/payments/history
 * @desc    Get payment history for logged-in user
 * @access  Private
 */
paymentRouter.get("/history", protect, PaymentController.getPaymentHistory);

// ========================================
// WEBHOOK ROUTE (NO AUTHENTICATION)
// IMPORTANT: This must be accessible without auth
// ========================================

/**
 * @route   POST /api/payments/webhook
 * @desc    Paystack webhook endpoint
 * @access  Public (but verified by signature)
 * @note    Configure this URL in Paystack Dashboard
 */
paymentRouter.post("/webhook", PaymentController.handleWebhook);

// ========================================
// ADMIN ROUTES (Authentication + Admin role required)
// ========================================

/**
 * @route   POST /api/payments/refund/:orderId
 * @desc    Initiate refund for an order
 * @access  Private/Admin
 * @body    { amount?: number, reason: string }
 */
paymentRouter.post(
  "/refund/:orderId",
  protect,
  adminOnly,
  PaymentController.initiateRefund
);

export default paymentRouter;
