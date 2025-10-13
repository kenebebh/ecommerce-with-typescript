import mongoose, { SchemaTypes } from "mongoose";
import type { IVerificationCode } from "../types/verificationCode.ts";
// import { VerificationCodeType } from "../types/verificationCode.ts";

const VerificationCodeSchema = new mongoose.Schema<IVerificationCode>(
  {
    // The generated verification or reset code
    code: {
      type: String,
      required: true,
      unique: true, // Ensure no two active codes are the same
    },
    userId: {
      type: SchemaTypes.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    type: {
      type: String,
      enum: ["emailVerification", "resetPassword"],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    // The expiration time for the code
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export the model
export const VerificationCode = mongoose.model<IVerificationCode>(
  "VerificationCode",
  VerificationCodeSchema,
  "verification_codes"
);
