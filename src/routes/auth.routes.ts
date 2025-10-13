import { Router } from "express";
import {
  createUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from "../controllers/auth.controller.ts";

const authRouter = Router();

authRouter.post("/create-user", createUser);
authRouter.post("/login", loginUser);
authRouter.post("/logout", logoutUser);
authRouter.get("/refresh", refreshAccessToken);

export default authRouter;
