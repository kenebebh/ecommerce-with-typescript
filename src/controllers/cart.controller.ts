import type { Request, Response, NextFunction } from "express";
import Cart from "../models/cart.model.ts";
import Product from "../models/product.model.ts";

export class CartController {
  /**
   * Get user's cart
   */
  static async getCart(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // req.user is set by authentication middleware
      const userId = req.user?._id;

      if (!userId) {
        res.status(401);
        throw new Error("User not authenticated");
      }

      // Find or create cart for user (this returns the document)
      let cart = await Cart.findOrCreateCart(userId);

      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add item to cart
   */
  static async addProductToCart(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?._id;

      const { productId } = req.body;

      if (!userId) {
        res.status(401);
        throw new Error("User not authenticated");
      }

      // Validate input
      if (!productId) {
        res.status(400);
        throw new Error("Product ID is required");
      }

      // Check if product exists and is active
      const product = await Product.findById(productId);

      if (!product) {
        res.status(404).json({
          success: false,
          message: "Product not found",
        });
        return;
      }

      if (!product.isActive) {
        res.status(400).json({
          success: false,
          message: "Product is not available",
        });
        return;
      }

      // Check stock availability
      if (!product.hasSufficientStock(1)) {
        res.status(400).json({
          success: false,
          message: `Product is out of stock`,
        });
        return;
      }

      // Find or create cart
      const cart = await Cart.findOrCreateCart(userId);

      // Add item to cart (uses current product price)
      await cart.addItem(productId, 1, product.price);

      // Populate and return updated cart
      const updatedCart = await Cart.findById(cart._id).populate({
        path: "items.productId",
        select: "name price slug isActive ",
      });

      res.status(200).json({
        success: true,
        message: "Item added to cart successfully",
        data: updatedCart,
      });
    } catch (error) {
      next(error);
    }
  }

  static async increaseProductQuantity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { productId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401);
      throw new Error("User not authenticated");
    }

    // Validate input
    if (!productId) {
      res.status(400);
      throw new Error("Product ID is required");
    }

    // Check if product exists
    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    // Find or create cart
    const cart = await Cart.findOrCreateCart(userId);

    // Check if adding this quantity would exceed available stock
    const currentQuantityInCart = cart.getItemQuantity(productId);
    const totalQuantity = currentQuantityInCart + 1;

    if (!product.hasSufficientStock(totalQuantity)) {
      res.status(400).json({
        success: false,
        message: `${totalQuantity} not available. Only ${product.availableQuantity} items are available`,
      });
      return;
    }

    // Add item to cart (uses current product price)
    await cart.addItem(productId, totalQuantity, product.price);
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?._id;
      const { productId } = req.params;

      if (!userId) {
        res.status(401);
        throw new Error("User not authenticated");
      }

      if (!productId) {
        res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
        return;
      }

      const cart = await Cart.findOne({ userId });

      if (!cart) {
        res.status(404).json({
          success: false,
          message: "Cart not found",
        });
        return;
      }

      if (!cart.hasProduct(productId)) {
        res.status(404).json({
          success: false,
          message: "Item not found in cart",
        });
        return;
      }

      await cart.removeItem(productId);

      const updatedCart = await Cart.findById(cart._id).populate({
        path: "items.productId",
        select: "name price images slug isActive availableQuantity",
      });

      res.status(200).json({
        success: true,
        message: "Item removed from cart",
        data: updatedCart,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear entire cart
   */
  static async clearCart(
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

      const cart = await Cart.findOne({ userId });

      if (!cart) {
        res.status(404).json({
          success: false,
          message: "Cart not found",
        });
        return;
      }

      await cart.clearCart();

      res.status(200).json({
        success: true,
        message: "Cart cleared successfully",
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cart summary (item count and subtotal)
   */
  static async getCartSummary(
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

      const cart = await Cart.findOne({ userId });

      if (!cart) {
        res.status(200).json({
          success: true,
          data: {
            totalItems: 0,
            subtotal: 0,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          totalItems: cart.totalItems,
          subtotal: cart.subtotal,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default CartController;
