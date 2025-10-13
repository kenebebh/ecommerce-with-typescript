import crypto from "crypto";

export const generateVerificationCode = (): string => {
  const VerificationCode = crypto.randomBytes(32).toString("hex");
  return VerificationCode;
};
