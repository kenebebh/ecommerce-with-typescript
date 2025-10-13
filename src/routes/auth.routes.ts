import { Router } from "express";
import {
  createUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  verifyUserEmail,
} from "../controllers/auth.controller.ts";

const authRouter = Router();

authRouter.post("/create-user", createUser);
authRouter.post("/login", loginUser);
authRouter.post("/logout", logoutUser);
authRouter.get("/refresh", refreshAccessToken);
authRouter.post("/verify-email", verifyUserEmail);

export default authRouter;
