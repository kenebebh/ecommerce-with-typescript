import mongoose, { Document, Types } from "mongoose";

// User Interface
export interface ISession extends Document {
  _id: Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
}
