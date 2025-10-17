import type { Request, Response, NextFunction } from "express";
import type { Model, Document, PopulateOptions } from "mongoose";

// Define the structure of pagination options
interface PaginateOptions {
  populate?: PopulateOptions | PopulateOptions[];
  select?: string | string[];
  sort?: string | Record<string, 1 | -1>;
}

// Define the structure of paginated results
export interface PaginatedResults<T> {
  success: boolean;
  count: number;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
    limit: number;
  };
}

const paginate = <T extends Document>(
  model: Model<T>,
  options: PaginateOptions = {}
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Build query filter from req.query (excluding pagination params)
      const filter: Record<string, any> = { ...req.query };
      delete filter.page;
      delete filter.limit;
      delete filter.sort;

      // Get total count for pagination calculations
      const totalItems = await model.countDocuments(filter);
      const totalPages = Math.ceil(totalItems / limit);

      // Build the query
      let query = model
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit);

      // Apply additional options
      if (options.populate) {
        query = query.populate(options.populate);
      }

      if (options.select) {
        query = query.select(options.select);
      }

      // Handle sorting
      const sortBy = (req.query.sort as string) || options.sort || "-createdAt";
      query = query.sort(sortBy);

      const results = await query;

      // Calculate pagination metadata
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Attach pagination data to res.locals for use in controller
      res.locals.paginatedResults = {
        success: true,
        count: results.length,
        data: results,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
          limit: limit,
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default paginate;
