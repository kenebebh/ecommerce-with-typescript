import { Router } from "express";
import ProductController from "../controllers/productController.ts";
import upload from "../middleware/multer.ts";
import paginate from "../middleware/paginate.ts";
import Product from "../models/product.model.ts";
// import { adminOnly } from "../middleware/authMiddleware.ts";

const productRouter = Router();

productRouter.post(
  "/",
  upload.array("productImages", 10),
  ProductController.createProduct
);
productRouter.get("/", paginate(Product), ProductController.getAllProducts);
productRouter.get("/low-stock", ProductController.getLowStockProducts);
productRouter.get("/:id", ProductController.getProductById);
productRouter.patch("/:id", ProductController.updateInventory);
productRouter.patch("/:id", ProductController.updateProduct);
productRouter.patch("/:id", ProductController.deactivateProduct);
productRouter.delete("/:id", ProductController.permanentlyDeleteProduct);

export default productRouter;
