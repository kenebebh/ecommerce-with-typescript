import { Document, Types } from "mongoose";

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

  comparePassword(candidatePassword: string): Promise<boolean>;
  fullName(): string;
}

export interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}
