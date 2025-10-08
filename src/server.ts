import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import "dotenv/config";
import { connectDatabase } from "./config/databaseConn.ts";

const app = express();
const PORT = 3000;

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  console.log(req.accepts);
  res.send("Hello World!");
  next();
});

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
