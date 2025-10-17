import { Router } from "express";
import {
  createUser,
  forgotPassword,
  loginUser,
  logoutUser,
  refreshAccessToken,
  resetPassword,
  verifyUserEmail,
  verifyResetOTP,
} from "../controllers/auth.controller.ts";

const authRouter = Router();

authRouter.post("/create-user", createUser);
authRouter.post("/login", loginUser);
authRouter.post("/logout", logoutUser);
authRouter.get("/refresh", refreshAccessToken);
authRouter.post("/verify-email", verifyUserEmail);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/verify-reset-otp", verifyResetOTP);
authRouter.post("/reset-password", resetPassword);

export default authRouter;
