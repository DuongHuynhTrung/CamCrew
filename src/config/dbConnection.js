const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

async function connectWithRetry(retry = 0) {
  const uri = process.env.CONNECTION_STRING;
  if (!uri) {
    console.error("[DB] Missing CONNECTION_STRING env");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("[DB] Connected");
  } catch (error) {
    const nextRetry = retry + 1;
    if (nextRetry > MAX_RETRIES) {
      console.error("[DB] Failed to connect after retries:", error.message);
      process.exit(1);
    }
    const delay = INITIAL_DELAY_MS * Math.pow(2, retry);
    console.warn(
      `[DB] Connection failed (attempt ${nextRetry}/${MAX_RETRIES}). Retrying in ${delay}ms...`
    );
    setTimeout(() => connectWithRetry(nextRetry), delay);
  }
}

module.exports = { connect: connectWithRetry };
