import { Router } from "express";
import OrderController from "../controllers/order.controller.ts";
import { protect } from "../middleware/authMiddleware.ts";
import { adminOnly } from "../middleware/authMiddleware.ts";
import paginate from "../middleware/paginate.ts";
import Order from "../models/order.model.ts";

const router = Router();

/**
 * @route   GET /api/orders/admin/all
 * @desc    Get all orders with pagination
 * @access  Private/Admin
 */
router.get(
  "/admin/all",
  protect,
  adminOnly,
  paginate(Order, {
    populate: { path: "userId", select: "name email" },
  }),
  OrderController.getAllOrders
);

/**
 * @route   GET /api/orders/admin/stats
 * @desc    Get order statistics
 * @access  Private/Admin
 */
router.get("/admin/stats", protect, adminOnly, OrderController.getOrderStats);

/**
 * @route   POST /api/orders
 * @desc    Create order from cart (Checkout)
 * @access  Private
 * @body    { shippingAddress: {...} }
 */
router.post("/", protect, OrderController.createOrder);

/**
 * @route   GET /api/orders
 * @desc    Get all orders for logged-in user
 * @access  Private
 */
router.get("/", protect, OrderController.getUserOrders);

/**
 * @route   GET /api/orders/:orderId
 * @desc    Get single order by ID
 * @access  Private
 */
router.get("/:orderId", protect, OrderController.getOrderById);

/**
 * @route   GET /api/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private
 */
router.get("/number/:orderNumber", protect, OrderController.getOrderByNumber);

/**
 * @route   POST /api/orders/:orderId/cancel
 * @desc    Cancel order
 * @access  Private
 * @body    { reason?: string }
 */
router.post("/:orderId/cancel", protect, OrderController.cancelOrder);

/**
 * @route   PATCH /api/orders/admin/:orderId/status
 * @desc    Update order status
 * @access  Private/Admin
 * @body    { status: string, note?: string }
 */
router.patch(
  "/admin/:orderId/status",
  protect,
  adminOnly,
  OrderController.updateOrderStatus
);

export default router;
