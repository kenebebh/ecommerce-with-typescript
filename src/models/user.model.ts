import mongoose, { Model } from "mongoose";
import bcrypt from "bcryptjs";
import type { IUser, UserMethods } from "../types/user.ts";

// const angel: IStudent = {
//     name: "angel",
//     class: 24,
//     subjects: "english"
// }

// console.log(angel)

const userSchema = new mongoose.Schema<IUser, Model<IUser>, UserMethods>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Hash password before saving
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
// userSchema.methods.comparePassword = async function (
//   candidatePassword: string
// ): Promise<boolean> {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

userSchema.method(
  "comparePassword",
  async function comparePassword(candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
  }
);

// // Generate Access Token (short-lived: 15 minutes)
// userSchema.methods.generateAccessToken = function (): string {
//   const payload: ITokenPayload = {
//     userId: this._id.toString(),
//     email: this.email,
//     role: this.role,
//   };

//   return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
//     expiresIn: '15m', // 15 minutes
//   });
// };

// // Generate Refresh Token (long-lived: 7 days)
// userSchema.methods.generateRefreshToken = function (): string {
//   const payload: ITokenPayload = {
//     userId: this._id.toString(),
//     email: this.email,
//     role: this.role,
//   };

//   return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
//     expiresIn: '7d', // 7 days
//   });
// };

// const User = mongoose.model<IUser>("User", userSchema);
const User = mongoose.model<IUser>("User", userSchema);

export default User;
