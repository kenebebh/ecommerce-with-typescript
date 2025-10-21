import { Router } from "express";
import ProductController from "../controllers/productController.ts";
import upload from "../middleware/multer.ts";
// import paginate from "../middleware/paginate.ts";
// import { adminOnly } from "../middleware/authMiddleware.ts";

const productRouter = Router();

productRouter.post(
  "/",
  upload.array("productImages", 10),
  ProductController.createProduct
);

export default productRouter;
