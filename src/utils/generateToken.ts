import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { Response } from "express";
import { MS_IN_MINUTE, MS_IN_DAY } from "./timeUtils.ts";

const generateAccessToken = (
  res: Response,
  userId: mongoose.Types.ObjectId,
  sessionId: mongoose.Types.ObjectId
): void => {
  // 1. Generate the JWT with both userId and sessionId in the payload
  const accessToken = jwt.sign(
    { userId, sessionId },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: "15m", // JWT expires after 15 minutes
    }
  );

  console.log("access token", accessToken);
  // 2. Set the token as an HTTP-only cookie
  res.cookie("accessToken", accessToken, {
    httpOnly: true, // Prevents client-side JavaScript access
    secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
    sameSite: "strict", // Protects against Cross-Site Request Forgery (CSRF)
    maxAge: 15 * MS_IN_MINUTE, // Cookie expiry in milliseconds (15 minutes)
  });
};

const generateRefreshToken = (
  res: Response,
  sessionId: mongoose.Types.ObjectId
): void => {
  // Use a separate secret for refresh tokens for security separation.
  const refreshTokenSecret = (process.env.REFRESH_TOKEN_SECRET ||
    process.env.ACCESS_TOKEN_SECRET) as string;

  // 1. Generate the JWT with only sessionId
  const refreshToken = jwt.sign({ sessionId }, refreshTokenSecret, {
    expiresIn: "30d", // JWT expires after 30 days
  });

  console.log("refresh token", refreshToken);

  // 2. Set the token as an HTTP-only cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // Prevents client-side JavaScript access
    secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
    sameSite: "strict", // Protects against CSRF
    maxAge: 30 * MS_IN_DAY, // Cookie expiry in milliseconds (30 days)
    path: "/api/auth/refresh", // Cookie is ONLY sent to this specific route for token rotation
  });
};

export { generateAccessToken, generateRefreshToken };
