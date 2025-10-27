import { Router } from "express";
import CartController from "../controllers/cart.controller.ts";
import { protect } from "../middleware/authMiddleware.ts";

const cartRouter = Router();

cartRouter.post("/", protect, CartController.addProductToCart);
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
cartRouter.delete(
  "/removeProduct/:productId",
  protect,
  CartController.removeProductFromCart
);
cartRouter.delete("/clear", protect, CartController.clearCart);
cartRouter.get("/getCartSummary", protect, CartController.getCartSummary);

export default cartRouter;
