import jwt, { type JwtPayload } from "jsonwebtoken";
import { type Response } from "express";

// Define the expected structure of the decoded JWT payload
export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  sessionId: string;
}

// Define the expected structure of the decoded JWT payload for the Refresh Token
export interface RefreshTokenPayload extends JwtPayload {
  sessionId: string;
}

/**
 * Decodes an Access Token and extracts the userId and sessionId from the payload.
 * Throws an error if the token is missing, invalid, or expired.
 *
 * @param token The raw JWT string (e.g., from a cookie).
 * @returns The decoded payload containing userId and sessionId.
 */
export const decodeAccessTokenPayload = (token: string): AccessTokenPayload => {
  // Ensure the secret is defined in the environment variables
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET environment variable is not defined.");
  }

  try {
    // 1. Verify and decode the token
    const decoded = jwt.verify(token, secret) as AccessTokenPayload;

    // 2. Simple type check to ensure required properties are present
    if (!decoded.userId || !decoded.sessionId) {
      throw new Error("Invalid token payload structure.");
    }

    return decoded;
  } catch (error) {
    // Handle JWT errors (e.g., JsonWebTokenError, TokenExpiredError)
    console.error("Token decoding failed:", error);
    // Re-throw a generic error to be caught by the error middleware
    throw new Error("Invalid or expired Access Token.");
  }
};

export const decodeRefreshTokenPayload = (
  token: string
): RefreshTokenPayload => {
  // Use a dedicated refresh secret for security, falling back to main secret
  const secret =
    process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not defined.");
  }

  try {
    // 1. Verify and decode the token
    const decoded = jwt.verify(token, secret) as RefreshTokenPayload;

    // 2. Simple type check to ensure required properties are present
    if (!decoded.sessionId) {
      throw new Error("Invalid Refresh Token payload structure.");
    }

    return decoded;
  } catch (error) {
    console.error("Refresh Token decoding failed:", error);
    throw new Error("Invalid or expired Refresh Token.");
  }
};

export const clearAuthCookies = (res: Response) => {
  const isProduction = process.env.NODE_ENV === "production";

  // 1. Clear Access Token cookie (set with default path '/')
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProduction, // Use secure cookies in production
    sameSite: "strict",
  });

  // 2. Clear Refresh Token cookie (MUST match the restricted path of '/auth/refresh')
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProduction, // Use secure cookies in production
    sameSite: "strict",
    path: "/api/auth/refresh", // CRUCIAL: Must specify the path to clear the restricted cookie
  });

  console.log("[Cookie Service] Access and Refresh cookies cleared.");
};
