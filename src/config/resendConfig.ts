import { Resend } from "resend";

const ResendApiKey = process.env.RESEND_API_KEY;

if (!ResendApiKey) {
  throw new Error("RESEND_API_KEY is not defined in environment variables");
}

const resend = new Resend(ResendApiKey);

export default resend;
