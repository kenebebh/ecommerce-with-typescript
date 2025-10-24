import { Router } from "express";
import CartController from "../controllers/cart.controller.ts";
import { protect } from "../middleware/authMiddleware.ts";
// import { adminOnly } from "../middleware/authMiddleware.ts";

const cartRouter = Router();

cartRouter.post("/", protect, CartController.addProductToCart);

export default cartRouter;
