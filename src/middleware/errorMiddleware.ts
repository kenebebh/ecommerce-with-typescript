import type { NextFunction, Request, Response } from "express";

// We define an interface that extends the base Error, adding the 'kind' property
// which is specific to Mongoose's CastError when an ObjectId is invalid.
interface CastError extends Error {
  kind?: string;
}

/**
 * Middleware to handle 404 Not Found errors for unhandled routes.
 * It creates a new Error object and passes it to the next error handler.
 */
const notFound = (req: Request, res: Response, next: NextFunction): void => {
  // Create a new Error object with a descriptive message
  const error = new Error(`Not Found - ${req.originalUrl}`);

  // Set the response status code to 404
  res.status(404);

  // Pass the error to the next middleware (which will be the errorHandler)
  next(error);
};

/**
 * Centralized error handling middleware.
 * This function takes 4 arguments, which is how Express identifies an error handler.
 */
const errorHandler = (err: Error, _: Request, res: Response): void => {
  // Determine the status code. If the response status is still 200 (OK), it means
  // the error was thrown outside of a custom status setting, so we default to 500 (Server Error).
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Type Assertion: Check for Mongoose CastError (e.g., invalid MongoDB ObjectId format)
  // We use 'as CastError' to tell TypeScript that this error object *might* have the 'kind' property.
  const mongooseError = err as CastError;

  if (mongooseError.name === "CastError" && mongooseError.kind === "ObjectId") {
    statusCode = 404; // Change status to Not Found
    message = "Resource not found"; // Provide a user-friendly message
  }

  // Ensure the response object is ready to send the status
  res.status(statusCode).json({
    // Only return the full error stack in development environment
    message: message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
    // Optionally include the full error object for debugging in development
    errorDetails: process.env.NODE_ENV !== "production" ? err : undefined,
  });
};

export { notFound, errorHandler };
