// import { IApiResponse, IAuthResponse } from './../types/index';
import type { NextFunction, Request, Response } from "express";
import User from "../models/user.model.ts";
import type { IUser } from "../types/user.ts";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.ts";
import Session from "../models/session.model.ts";
import {
  decodeAccessTokenPayload,
  clearAuthCookies,
  decodeRefreshTokenPayload,
} from "../utils/jwtUtils.ts";
import { deleteSessionFromDB } from "../services/sesionService.ts";

export const createUser = async (
  req: Request<{}, {}, IUser, {}>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, email, password, role, phoneNumber, address } =
      req.body;

    //check if user exists before creating user on database, if user exits, return an error
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    //create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber,
      address,
    });

    //create session
    const session = await Session.create({
      userId: user._id,
    });

    //create access token and refreh token
    generateAccessToken(res, user._id, session._id);
    generateRefreshToken(res, session._id);

    //return user &  tokens

    res.status(201).json({
      message: "User Created Succesfully",
      data: user,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    next(errorMessage);
  }
};

export const loginUser = async (
  req: Request<{}, {}, { email: string; password: string }, {}>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      //create session
      const session = await Session.create({
        userId: user._id,
      });

      //create access token and refresh token
      generateAccessToken(res, user._id, session._id);
      generateRefreshToken(res, session._id);

      res.status(200).json({ message: "User logged in", data: user });
    } else {
      res.status(401);
      throw new Error("Invalid email or password");
    }
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Get Access Token from cookies
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      // If no access token is present, we clear the remaining cookies just in case.
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken", { path: "/auth/refresh" });
      // Send successful response even if token is missing (idempotent logout)
      return res
        .status(200)
        .json({ message: "User logged out successfully (no token found)." });
    }

    // 2. Decode token to get sessionId using the utility function
    // This is where our utility function separates concerns perfectly!
    const { sessionId } = decodeAccessTokenPayload(accessToken);

    // 3. Delete the session from the database (Crucial security step)
    // We now call the function from the dedicated Service layer
    await deleteSessionFromDB(sessionId);

    // 4. Clear both cookies (Access Token and Refresh Token)
    clearAuthCookies(res);

    // 5. Send success response
    res.status(200).json({
      message: "User logged out successfully and session terminated.",
    });
  } catch (error) {
    // If decoding fails (e.g., token expired/invalid), we still clear the cookies for safety
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/auth/refresh" });

    // Pass the error to the error middleware for logging/handling
    next(error);
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Get Refresh Token from the secure cookie (only available on this path)
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      // No refresh token means the user is not authenticated or session is gone
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ message: "Access denied. No refresh token provided." });
    }

    // 2. Decode the refresh token to get the sessionId
    const { sessionId } = decodeRefreshTokenPayload(refreshToken);

    // 3. Find the session in the database
    const session = await Session.findOne({ _id: sessionId });

    if (!session) {
      // Session was not found (e.g., deleted by an admin)
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ message: "Access denied. Session not found in database." });
    }

    // 4. Check if the database session itself has expired
    if (new Date(session.expiresAt) < new Date()) {
      // Session expired. Must force logout and terminate session.
      await deleteSessionFromDB(sessionId);
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ message: "Access denied. Session has expired." });
    }

    // 5. If valid, generate a new Access Token
    // NOTE: We use the userId and sessionId retrieved from the secure database session.
    generateAccessToken(res, session.userId, session._id);

    // 6. Send success response (new access token is in the cookie)
    res.status(200).json({ message: "Access token successfully refreshed." });
  } catch (error) {
    // Handle all token-related errors (e.g., JWT verification failure, invalid payload)
    clearAuthCookies(res);
    next(error);
  }
};
