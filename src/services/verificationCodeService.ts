import { VerificationCode } from "../models/verificationCode.model.ts";

export const deleteVerificationCodeFromDB = async (
  codeId: string
): Promise<void> => {
  const deletedCode = await VerificationCode.findByIdAndDelete(codeId);

  if (!deletedCode) {
    throw new Error("Verification code not found or already deleted");
  }

  // Placeholder for demonstration:
  console.log(
    `Verification code document with ID: ${codeId} successfully deleted.`
  );

  return Promise.resolve();
};
