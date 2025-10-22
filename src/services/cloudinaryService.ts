import cloudinary from "../config/cloudinaryConfig.js";
import fs from "fs";
import type { IProductImage } from "../types/product.ts";

class CloudinaryService {
  // Delete local file helper
  static deleteLocalFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error("Error deleting local file:", error);
    }
  }

  // Upload multiple product images
  static async uploadMultipleProductImages(
    files: Express.Multer.File[],
    identifier: string // Can be productId or product name
  ): Promise<IProductImage[]> {
    const uploadPromises = files.map((file, index) =>
      this.uploadSingleProductImage(file.path, identifier, index)
    );

    try {
      const results = await Promise.all(uploadPromises);

      // Clean up all local files after successful upload
      files.forEach((file) => this.deleteLocalFile(file.path));

      return results;
    } catch (error) {
      // Clean up local files on error
      files.forEach((file) => this.deleteLocalFile(file.path));
      throw error;
    }
  }

  // Upload single product image
  static async uploadSingleProductImage(
    filePath: string,
    identifier: string,
    index: number
  ): Promise<IProductImage> {
    try {
      const uploadResult = await cloudinary.uploader.upload(filePath, {
        folder: "products",
        public_id: `product_${identifier}_${index}_${Date.now()}`,
        transformation: [
          { width: 800, height: 800, crop: "limit" }, // Max dimensions
          { quality: "auto:good", fetch_format: "auto" }, // Auto optimization
        ],
        resource_type: "image",
      });

      return {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        asset_id: uploadResult.asset_id,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
      };
    } catch (error) {
      throw error;
    }
  }

  // Delete single image
  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (error) {
      console.error("Error deleting image from cloudinary:", error);
      return false;
    }
  }

  // Delete multiple images
  static async deleteMultipleImages(publicIds: string[]): Promise<void> {
    try {
      const deletePromises = publicIds.map((id) => this.deleteImage(id));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error deleting multiple images:", error);
      throw error;
    }
  }
}

export default CloudinaryService;
