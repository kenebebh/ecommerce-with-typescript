import { Router } from "express";
import {
  createUser,
  forgotPassword,
  loginUser,
  logoutUser,
  refreshAccessToken,
  resetPassword,
  verifyUserEmail,
} from "../controllers/auth.controller.ts";

const authRouter = Router();

authRouter.post("/create-user", createUser);
authRouter.post("/login", loginUser);
authRouter.post("/logout", logoutUser);
authRouter.get("/refresh", refreshAccessToken);
authRouter.post("/verify-email/:code", verifyUserEmail);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password/:code", resetPassword);

export default authRouter;
