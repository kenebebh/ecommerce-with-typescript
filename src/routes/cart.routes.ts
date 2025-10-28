import { Router } from "express";
import CartController from "../controllers/cart.controller.ts";
import { protect } from "../middleware/authMiddleware.ts";

const cartRouter = Router();

cartRouter.get("/", protect, CartController.getCart);
cartRouter.post(
  "/increaseQuantity",
  protect,
  CartController.increaseProductQuantity
);
cartRouter.post(
  "/decreaseQuantity",
  protect,
  CartController.decreaseProductQuantity
);
cartRouter.post("/:productId", protect, CartController.addProductToCart);
cartRouter.delete(
  "/removeProduct/:productId",
  protect,
  CartController.removeProductFromCart
);
cartRouter.delete("/clear", protect, CartController.clearCart);
cartRouter.get("/getCartSummary", protect, CartController.getCartSummary);

export default cartRouter;
