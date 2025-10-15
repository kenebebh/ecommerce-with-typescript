import resend from "../config/resendConfig.ts";

type ResendParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const getFromEmail = () =>
  process.env.NODE_ENV === "development"
    ? "onboarding@resend.dev"
    : process.env.EMAIL_SENDER || "devbebh@gmail.com";

const getToEmail = (to: string) =>
  process.env.NODE_ENV === "development" ? "delivered@resend.dev" : to;

export const sendMail = async ({ to, subject, text, html }: ResendParams) =>
  await resend.emails.send({
    from: getFromEmail(),
    to: getToEmail(to),
    subject,
    text,
    html,
  });
