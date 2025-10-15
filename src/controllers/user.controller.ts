import type { RequestHandler } from "express";
import User from "../models/user.model.ts";

export const getUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?._id).select("-password");

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};
