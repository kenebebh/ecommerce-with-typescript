import type { Request, Response, NextFunction } from "express";
import Cart from "../models/cart.model.ts";
import Product from "../models/product.model.ts";
import categoryRouter from "../routes/category.routes.ts";

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
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
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
  static async addToCart(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?._id;
      const { productId, quantity } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
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
      if (!product.hasSufficientStock(quantity)) {
        res.status(400).json({
          success: false,
          message: `Only ${product.availableQuantity} items available in stock`,
        });
        return;
      }

      // Find or create cart
      const cart = await Cart.findOrCreateCart(userId);

      // Check if adding this quantity would exceed available stock
      const currentQuantityInCart = cart.getItemQuantity(productId);
      const totalQuantity = currentQuantityInCart + quantity;

      if (!product.hasSufficientStock(totalQuantity)) {
        res.status(400).json({
          success: false,
          message: `Cannot add ${quantity} more. Only ${
            product.availableQuantity - currentQuantityInCart
          } items can be added`,
        });
        return;
      }

      // Add item to cart (uses current product price)
      await cart.addItem(productId, quantity, product.price);

      // Populate and return updated cart
      const updatedCart = await Cart.findById(cart._id).populate({
        path: "items.productId",
        select: "name price images slug isActive availableQuantity",
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

  /**
   * Update cart item quantity
   */
  static async updateCartItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?._id;
      const { productId } = req.params;
      const { quantity } = req.body;

      if (!productId) {
        res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      // Validate quantity
      if (quantity === undefined || quantity < 0) {
        res.status(400).json({
          success: false,
          message: "Valid quantity is required",
        });
        return;
      }

      // Get user's cart
      const cart = await Cart.findOne({ userId });

      if (!cart) {
        res.status(404).json({
          success: false,
          message: "Cart not found",
        });
        return;
      }

      // Check if item exists in cart
      if (!cart.hasProduct(productId)) {
        res.status(404).json({
          success: false,
          message: "Item not found in cart",
        });
        return;
      }

      // If quantity is 0, remove item
      if (quantity === 0) {
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
        return;
      }

      // Check stock availability
      const product = await Product.findById(productId);

      if (!product) {
        res.status(404).json({
          success: false,
          message: "Product not found",
        });
        return;
      }

      if (!product.hasSufficientStock(quantity)) {
        res.status(400).json({
          success: false,
          message: `Only ${product.availableQuantity} items available in stock`,
        });
        return;
      }

      // Update quantity
      await cart.updateItemQuantity(productId, quantity);

      // Populate and return updated cart
      const updatedCart = await Cart.findById(cart._id).populate({
        path: "items.productId",
        select: "name price images slug isActive availableQuantity",
      });

      res.status(200).json({
        success: true,
        message: "Cart updated successfully",
        data: updatedCart,
      });
    } catch (error) {
      next(error);
    }
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

      if (!productId) {
        res.status(400).json({
          success: false,
          message: "Product ID is required",
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
