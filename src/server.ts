import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import { connectDatabase } from "./config/databaseConn.ts";
import { errorHandler, notFound } from "./middleware/errorMiddleware.ts";
import authRouter from "./routes/auth.routes.ts";

// import crypto from "crypto";

// // Generate 32 random bytes
// const randomBytes = crypto.randomBytes(32);
// console.log(randomBytes);

// // Convert to hexadecimal string (readable format)
// const verificationCode = randomBytes.toString("hex");
// console.log(verificationCode);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.get("/", (req: Request, res: Response, next: NextFunction) => {
  console.log(req.accepts);
  res.send("Hello World!");
  next();
});

app.use(notFound);
app.use(errorHandler);

// Connect to database FIRST, then start server
const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Failed to start server:", errorMessage);
    process.exit(1);
  }
};

startServer();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
