import { Router } from "express";
import {
  createUser,
  loginUser,
  logoutUser,
} from "../controllers/auth.controller.ts";

const authRouter = Router();

authRouter.post("/create-user", createUser);
authRouter.post("/login", loginUser);
authRouter.post("/logout", logoutUser);

export default authRouter;
