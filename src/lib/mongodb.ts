
// src/lib/mongodb.ts
import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongoConnection:
    | {
        conn: mongoose.Mongoose | null;
        promise: Promise<mongoose.Mongoose> | null;
      }
    | undefined;
}

const globalRef = global as any;
const cached = globalRef._mongoConnection ?? { conn: null, promise: null };

export async function connectDB() {
  // Read env *inside* the function to avoid throwing during module import/build time
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // Throwing here is fine — it will occur at request time (not build/import time).
    throw new Error("MONGODB_URI is not defined. Set MONGODB_URI in your environment.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        // recommended options can go here
        // useUnifiedTopology and useNewUrlParser are not required for modern mongoose versions
        bufferCommands: false,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  globalRef._mongoConnection = cached;
  return cached.conn;
}
