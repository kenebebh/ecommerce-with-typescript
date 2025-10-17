import crypto from "crypto";

export const generateVerificationCode = (): string => {
  // Generate a random integer between 100000 (inclusive) and 1000000 (exclusive)
  // This guarantees a 6-digit number without needing to worry about leading zeros.
  const otp = crypto.randomInt(100000, 1000000);
  return otp.toString();
};
