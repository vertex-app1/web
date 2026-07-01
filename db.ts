import mongoose from "mongoose";

let isConnected = false;

/**
 * Connect to MongoDB Atlas using the MONGO_URI environment variable.
 * Returns true if connection is successful, false otherwise.
 */
export async function connectDB(): Promise<boolean> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn("⚠️ MONGO_URI is not defined in environment variables. Falling back to local file storage.");
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of hanging
    });
    isConnected = true;
    console.log("✅ MongoDB Atlas connected successfully.");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    console.warn("⚠️ MongoDB connection failed. Falling back to local file storage.");
    return false;
  }
}

/**
 * Check if the MongoDB connection is currently active.
 */
export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
