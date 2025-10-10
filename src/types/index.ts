import { type Request } from "express";

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

// API Response Types
export interface IApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Auth Response
export interface IAuthResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}
