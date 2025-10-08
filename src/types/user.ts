import { Document, Types } from "mongoose";
import { type Request } from "express";

export interface IStudent {
  name: string;
  class: string;
  subjects: string[];
}

// User Interface
export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "customer" | "admin";
  verified: boolean;
  phoneNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  // generateAccessToken(): string;
  // generateRefreshToken(): string;
}

export interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Token Payload
export interface ITokenPayload {
  userId: string;
  email: string;
  role: "customer" | "admin";
}

// Extended Request with user
export interface IAuthRequest extends Request {
  user?: ITokenPayload;
}
