import type { IUser } from "../user.ts";

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // or whatever your User type is
    }
  }
}
