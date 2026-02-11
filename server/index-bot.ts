import { startBot } from "./bot";
import dotenv from "dotenv";

dotenv.config();

// Ensure database URL is available
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing!");
  process.exit(1);
}

async function run() {
  console.log("Starting Discord Bot in standalone mode...");
  try {
    await startBot();
  } catch (err) {
    console.error("Failed to start bot:", err);
    process.exit(1);
  }
}

run();
