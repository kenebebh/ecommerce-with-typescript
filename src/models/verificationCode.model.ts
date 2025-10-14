import mongoose, { SchemaTypes } from "mongoose";
import { VerificationCodeType } from "../types/verificationCode.ts";
import type { IVerificationCode } from "../types/verificationCode.ts";

const VerificationCodeSchema = new mongoose.Schema<IVerificationCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: SchemaTypes.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    type: {
      type: String,
      enum: Object.values(VerificationCodeType),
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt automatically
  }
);

VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationCode = mongoose.model<IVerificationCode>(
  "VerificationCode",
  VerificationCodeSchema,
  "verification_codes"
);
