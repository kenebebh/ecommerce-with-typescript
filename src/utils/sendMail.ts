// import resend from "../config/resend";
// import { EMAIL_SENDER, NODE_ENV } from "../constants/env";

type Params = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const getFromEmail = () =>
  process.env.NODE_ENV === "development"
    ? "onboarding@resend.dev"
    : process.env.EMAIL_SENDER;

const getToEmail = (to: string) =>
  process.env.NODE_ENV === "development" ? "delivered@resend.dev" : to;

// export const sendMail = async ({ to, subject, text, html }: Params) =>
//   await resend.emails.send({
//     from: getFromEmail(),
//     to: getToEmail(to),
//     subject,
//     text,
//     html,
//   });
