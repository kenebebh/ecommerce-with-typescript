import { Router } from "express";
import User from "../models/user.model.ts";
import { getUserProfile, getAllUsers } from "../controllers/user.controller.ts";
import paginate from "../middleware/paginate.ts";
import { adminOnly } from "../middleware/authMiddleware.ts";

const userRouter = Router();

userRouter.get("/me", getUserProfile);
userRouter.get(
  "/",
  adminOnly,
  paginate(User, {
    select: "-password",
  }),
  getAllUsers
);

export default userRouter;
