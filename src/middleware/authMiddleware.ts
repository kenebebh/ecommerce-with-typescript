import User from "../models/user.model.ts";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { decodeAccessTokenPayload } from "../utils/jwtUtils.ts";

export type Role = "admin" | "customer";

export const protect: RequestHandler = async (req, res, next) => {
  const accessToken = req.cookies.accessToken;

  if (accessToken) {
    try {
      const { userId, sessionId } = decodeAccessTokenPayload(accessToken);

      req.user = await User.findById(userId).select("-password");
      req.sessionId = sessionId;

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error("Not authorized, token failed");
      next(error);
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated. Please create an account or login",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(
          ", "
        )}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

// Authorization middleware - check if user can modify user account
export const authorizeUserAccess: RequestHandler = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    // Admin can modify any user
    if (req.user?.role === "admin") {
      return next();
    }

    // Users can only modify their own account
    if (req.user?._id.toString() !== targetUserId?.toString()) {
      return res.status(403).json({
        message: "Access denied. You can only modify your own account.",
      });
    }

    next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    next(errorMessage);
  }
};

// Middleware for admin-only routes
export const adminOnly = authorize("admin");
