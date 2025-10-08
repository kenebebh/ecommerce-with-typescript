import type { NextFunction, Request, Response } from "express";
import User from "../models/user.model.ts";
import type { IUser } from "../types/user.ts";

export const createUser = async (
  req: Request<{}, {}, IUser, {}>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    const newUser = User.create({
      firstName,
      lastName,
      email,
      password,
      role,
    });

    if (newUser) {
      res.status(201).json({
        message: "User Created Succesfully",
        data: newUser,
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    next(errorMessage);
  }
};
