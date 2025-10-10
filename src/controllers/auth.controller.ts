// import { IApiResponse, IAuthResponse } from './../types/index';
import type { NextFunction, Request, Response } from "express";
import User from "../models/user.model.ts";
import type { IUser } from "../types/user.ts";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.ts";
import Session from "../models/session.model.ts";

export const createUser = async (
  req: Request<{}, {}, IUser, {}>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, email, password, role, phoneNumber, address } =
      req.body;

    //check if user exists before creating user on database, if user exits, return an error
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    //create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber,
      address,
    });

    //create session
    const session = await Session.create({
      userId: user._id,
    });

    //create access token and refreh token
    generateAccessToken(res, user._id, session._id);
    generateRefreshToken(res, session._id);

    //return user &  tokens

    res.status(201).json({
      message: "User Created Succesfully",
      data: user,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    next(errorMessage);
  }
};
