import mongoose from "mongoose";

export const connectDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    const connection = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Database connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    // console.error("Database connection failed:", error.message);
    // throw error; // Re-throw to handle in main file

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Database connection failed:", errorMessage);
    throw error;
  }
};
