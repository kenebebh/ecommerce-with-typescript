import type { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import Category from "../models/category.model.ts";
import CloudinaryService from "../services/cloudinaryService.ts";
import type { ICategory } from "../types/category.ts";

/**
 * CREATE CATEGORY (Main Category or Subcategory)
 * To create main category: don't send parentCategory
 * To create subcategory: send parentCategory with existing category ID
 */
export const createCategory = async (
  req: Request<{}, {}, ICategory>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, parentCategory } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400);
      throw new Error("Category name is required");
    }

    // If parentCategory is provided, verify it exists
    if (parentCategory) {
      const parentExists = await Category.findById(parentCategory);
      if (!parentExists) {
        res.status(404);
        throw new Error("Parent category not found");
      }

      // Optional: Prevent creating subcategories of subcategories
      // if (parentExists.parentCategory) {
      //   res.status(400);
      //   throw new Error("Cannot create subcategory of a subcategory. Only 2 levels allowed.");
      // }
    }

    // Generate a new MongoDB ObjectId BEFORE creating the category
    const categoryId = new Types.ObjectId().toString();

    // Handle image upload if provided
    let imageData = undefined;

    if (req.file) {
      const uploadResult = await CloudinaryService.uploadSingleCategoryImage(
        req.file.path,
        categoryId
      );

      imageData = uploadResult;
    }

    // Create category
    const category = await Category.create({
      _id: categoryId,
      name,
      parentCategory: parentCategory || null,
      image: imageData,
    });

    // Populate parent category info if it exists
    await category.populate("parentCategory", "name slug");

    res.status(201).json({
      success: true,
      message: `${
        parentCategory ? "Subcategory" : "Category"
      } created successfully`,
      data: category,
    });
  } catch (error) {
    next(error);
  } finally {
    // Always attempt to delete local files
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      files.forEach((file) => {
        CloudinaryService.deleteLocalFile(file.path);
      });
    }
  }
};

/**
 * GET ALL CATEGORIES (with optional filters)
 * Can filter by: main categories only, active status, etc.
 */
export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mainOnly, includeSubcategories, includeProductCount } = req.query;

    // Build query
    const query: any = {};

    // Filter for main categories only (those without parent)
    if (mainOnly === "true") {
      query.parentCategory = null;
    }

    // Get categories
    let categoriesQuery = Category.find(query).sort({ name: 1 });

    // Populate subcategories if requested
    if (includeSubcategories === "true") {
      categoriesQuery = categoriesQuery.populate({
        path: "subcategories",
        match: { isActive: true },
        select: "name slug image isActive",
      });
    }

    // Populate product count if requested
    if (includeProductCount === "true") {
      categoriesQuery = categoriesQuery.populate("productCount");
    }

    const categories = await categoriesQuery;

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET CATEGORY BY ID
 * Returns single category with all details
 */
export const getCategoryById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id)
      .populate("parentCategory", "name slug")
      .populate({
        path: "subcategories",
        match: { isActive: true },
        select: "name slug image isActive",
      })
      .populate("productCount");

    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET CATEGORY BY SLUG
 * Used for SEO-friendly URLs
 */
export const getCategoryBySlug = async (
  req: Request<{ slug: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug })
      .populate("parentCategory", "name slug")
      .populate({
        path: "subcategories",
        match: { isActive: true },
        select: "name slug image isActive",
      })
      .populate("productCount");

    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE CATEGORY
 * Can update name, image, active status, or move to different parent
 */
export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, parentCategory, isActive } = req.body;

    if (!id) {
      res.status(400);
      throw new Error("Category ID is required");
    }

    // Find existing category
    const category = await Category.findById(id);

    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    // Validate parent category if being changed
    if (parentCategory !== undefined) {
      if (parentCategory) {
        // Check if new parent exists
        const parentExists = await Category.findById(parentCategory);
        if (!parentExists) {
          res.status(404);
          throw new Error("Parent category not found");
        }

        // Prevent making category its own parent
        if (parentCategory === id) {
          res.status(400);
          throw new Error("Category cannot be its own parent");
        }

        // Prevent circular reference (can't move parent under its child)
        const wouldCreateCircular = await checkCircularReference(
          id,
          parentCategory
        );
        if (wouldCreateCircular) {
          res.status(400);
          throw new Error("Cannot move category under its own subcategory");
        }
      }
      category.parentCategory = parentCategory || null;
    }

    // Update name if provided
    if (name) {
      category.name = name;
      // Slug will be auto-generated by pre-save hook
    }

    // Update active status if provided
    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    // Handle image upload if new image provided
    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (category.image?.public_id) {
        await CloudinaryService.deleteImage(category.image.public_id);
      }

      // Upload new image
      const uploadResult = await CloudinaryService.uploadSingleCategoryImage(
        req.file.path,
        category._id.toString()
      );

      category.image = {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        asset_id: uploadResult.asset_id,
      };
    }

    await category.save();

    // Populate relations
    await category.populate("parentCategory", "name slug");

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE CATEGORY
 * Will fail if category has subcategories or products
 */
export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    // Delete image from Cloudinary if exists
    if (category.image?.public_id) {
      try {
        await CloudinaryService.deleteImage(category.image.public_id);
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        // Continue with deletion even if image deletion fails
      }
    }

    // This will trigger the pre-deleteOne hook which checks for subcategories and products
    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE CATEGORY IMAGE
 * Removes image from category without deleting the category
 */
export const deleteCategoryImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    if (!category.image?.public_id) {
      res.status(400);
      throw new Error("Category has no image to delete");
    }

    // Delete from Cloudinary
    await CloudinaryService.deleteImage(category.image.public_id);

    // Remove image from database
    category.image = {
      public_id: null,
      secure_url: null,
      asset_id: null,
    };

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category image deleted successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HELPER FUNCTION
 * Check if moving a category would create a circular reference
 */
async function checkCircularReference(
  categoryId: string,
  newParentId: string
): Promise<boolean> {
  let currentParent = await Category.findById(newParentId);

  while (currentParent) {
    // If we find the original category in the parent chain, it's circular
    if (currentParent._id.toString() === categoryId) {
      return true;
    }

    // Move up the chain
    if (currentParent.parentCategory) {
      currentParent = await Category.findById(currentParent.parentCategory);
    } else {
      currentParent = null;
    }
  }

  return false;
}

/**
 * TOGGLE CATEGORY STATUS
 * Quick endpoint to activate/deactivate categories
 */
export const toggleCategoryStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    category.isActive = !category.isActive;
    await category.save();

    res.status(200).json({
      success: true,
      message: `Category ${
        category.isActive ? "activated" : "deactivated"
      } successfully`,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};
