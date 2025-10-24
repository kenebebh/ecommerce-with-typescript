import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryBySlug,
  getCategoryById,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  deleteCategoryImage,
} from "../controllers/category.controller.ts";
import upload from "../middleware/multer.ts";
import { protect } from "../middleware/authMiddleware.ts";
// import { adminOnly } from "../middleware/authMiddleware.ts";

const categoryRouter = Router();

categoryRouter.post("/", upload.single("categoryImage"), createCategory);
categoryRouter.get("/", getAllCategories);
categoryRouter.get("/slug/:slug", getCategoryBySlug);
categoryRouter.get("/:id", getCategoryById);

categoryRouter.patch(
  "/:id",
  protect,
  upload.single("categoryImage"),
  updateCategory
);
categoryRouter.delete("/:id", protect, deleteCategory);
categoryRouter.delete("/:id/image", protect, deleteCategoryImage);
categoryRouter.patch("/:id/toggle-status", protect, toggleCategoryStatus);

export default categoryRouter;
