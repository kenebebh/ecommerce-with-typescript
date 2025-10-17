import type { NextFunction, Request, Response } from "express";
import User from "../models/user.model.ts";
import type { IUser } from "../types/user.ts";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.ts";
import Session from "../models/session.model.ts";
import { VerificationCode } from "../models/verificationCode.model.ts";
import {
  decodeAccessTokenPayload,
  clearAuthCookies,
  decodeRefreshTokenPayload,
} from "../utils/jwtUtils.ts";
import { deleteSessionFromDB } from "../services/sesionService.ts";
import {
  getPasswordResetTemplate,
  getVerifyEmailTemplate,
} from "../utils/emailTemplates.ts";
import { generateVerificationCode } from "../utils/generateVerificationCode.ts";
import { deleteVerificationCodeFromDB } from "../services/verificationCodeService.ts";
import { VerificationCodeType } from "../types/verificationCode.ts";
import { oneDayFromNow, tenMinutesFromNow } from "../utils/timeUtils.ts";
import { sendMail } from "../utils/sendMail.ts";

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

    //create verification code
    const uniqueCode = generateVerificationCode();

    await VerificationCode.create({
      code: uniqueCode,
      userId: user._id,
      type: VerificationCodeType.EMAIL_VERIFICATION,
      expiresAt: oneDayFromNow(),
    });

    // //send verification email
    const { error } = await sendMail({
      to: user.email,
      ...getVerifyEmailTemplate(uniqueCode),
    });

    if (error) {
      return res.status(400).json({ error });
    }

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

export const verifyUserEmail = async (
  req: Request<{ code: string }, {}, {}, {}>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code } = req.params;

    const verificationCode = await VerificationCode.findOne({ code });

    if (!verificationCode) {
      res.status(400);
      throw new Error(
        "No verification code found. Please request for verification again"
      );
    }

    if (new Date(verificationCode.expiresAt) < new Date()) {
      // Code expired.
      await deleteVerificationCodeFromDB(verificationCode._id.toString());
      return res.status(401).json({
        message: "Your code has expired. Please request for verification again",
      });
    }

    const user = await User.findOne({ _id: verificationCode.userId });

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.verified = true;
    await user.save();

    //delete the used verification code
    await deleteVerificationCodeFromDB(verificationCode._id.toString());

    res
      .status(200)
      .json({ message: "Email verified successfully", data: user });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request<{}, {}, { email: string }, {}>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error("User with this email does not exist");
    }

    //create verification code
    const uniqueCode = generateVerificationCode();

    await VerificationCode.create({
      code: uniqueCode,
      userId: user._id,
      type: VerificationCodeType.RESET_PASSWORD,
      expiresAt: tenMinutesFromNow(),
    });

    // //send verification email
    const { error } = await sendMail({
      to: user.email,
      ...getPasswordResetTemplate(uniqueCode),
    });

    if (error) {
      return res.status(400).json({ error });
    }

    res.status(200).json({
      message:
        "Please check your inbox, and follow the next steps to change your password",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    next(errorMessage);
  }
};

export const verifyResetOTP = async (
  req: Request<{}, {}, { email: string; code: string }, {}>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, code } = req.body;

    // Validate input
    if (!email || !code) {
      res.status(400);
      throw new Error("Email and code are required");
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(400);
      throw new Error("Invalid email or code");
    }

    // Find verification code for this user
    const verificationCode = await VerificationCode.findOne({
      code: code.trim(),
      userId: user._id,
      type: VerificationCodeType.RESET_PASSWORD,
    });

    if (!verificationCode) {
      res.status(400);
      throw new Error("Invalid or expired code");
    }

    // Check if code has expired
    if (new Date(verificationCode.expiresAt) < new Date()) {
      await deleteVerificationCodeFromDB(verificationCode._id.toString());
      res.status(401);
      throw new Error("Code has expired. Please request a new one.");
    }

    // OTP is valid!
    // Return success - frontend will now show the "new password" form
    res.status(200).json({
      success: true,
      message: "Code verified successfully. You can now reset your password.",
      // Return this so frontend can send it with the password reset
      verificationId: verificationCode._id.toString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    next(errorMessage);
  }
};

/**
 * STEP 3: RESET PASSWORD
 * After OTP is verified, user can set new password
 * Uses the verificationId from the previous step
 */
export const resetPassword = async (
  req: Request<
    {},
    {},
    { email: string; code: string; newPassword: string },
    {}
  >,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, code, newPassword } = req.body;

    // Validate input
    if (!email || !code || !newPassword) {
      res.status(400);
      throw new Error("Email, code, and new password are required");
    }

    // Validate password strength
    if (newPassword.length < 8) {
      res.status(400);
      throw new Error("Password must be at least 8 characters long");
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(400);
      throw new Error("Invalid request");
    }

    // Find and verify the code one more time
    const verificationCode = await VerificationCode.findOne({
      code: code.trim(),
      userId: user._id,
      type: VerificationCodeType.RESET_PASSWORD,
    });

    if (!verificationCode) {
      res.status(400);
      throw new Error("Invalid or expired code");
    }

    // Check if code has expired
    if (new Date(verificationCode.expiresAt) < new Date()) {
      await deleteVerificationCodeFromDB(verificationCode._id.toString());
      res.status(401);
      throw new Error("Code has expired. Please request a new one.");
    }

    // Update password (assuming your User model hashes it with pre-save hook)
    user.password = newPassword;
    await user.save();

    // Delete the verification code (one-time use)
    await deleteVerificationCodeFromDB(verificationCode._id.toString());

    // Optional: Delete all other reset codes for this user
    await VerificationCode.deleteMany({
      userId: user._id,
      type: VerificationCodeType.RESET_PASSWORD,
    });

    res.status(200).json({
      success: true,
      message:
        "Password reset successful! You can now log in with your new password.",
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
      clearAuthCookies(res);
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
