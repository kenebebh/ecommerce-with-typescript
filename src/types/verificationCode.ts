import { Document, Types } from "mongoose";

// 1. Define the possible types for the verification code
export enum VerificationCodeType {
  EMAIL_VERIFICATION = "emailVerification",
  RESET_PASSWORD = "resetPassword",
}

// 2. Define the interface for the document data
export interface IVerificationCode extends Document {
  code: string;
  userId: Types.ObjectId;

  type: VerificationCodeType;

  createdAt?: Date;

  expiresAt: Date;
}
