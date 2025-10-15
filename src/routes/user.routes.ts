import { Router } from "express";
import { getUserHandler } from "../controllers/user.controller.ts";

const userRouter = Router();

userRouter.get("/me", getUserHandler);

export default userRouter;
