import { Router } from "express";
import { createUser } from "../controllers/auth.controller.ts";

const authRouter = Router();

authRouter.post("/create-user", createUser);

export default authRouter;
