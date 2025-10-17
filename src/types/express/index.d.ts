import type { IUser } from "../user.ts";
import mongoose from "mongoose";

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // or whatever your User type is
      sessionId: mongoose.Types.ObjectId | string;
    }
    interface Locals {
      paginatedResults?: PaginatedResults<any>;
    }
  }
}
