import { startBot } from "./bot";
import dotenv from "dotenv";

dotenv.config();

console.log("Starting Discord Bot in standalone mode...");
startBot().catch(err => {
  console.error("Failed to start bot:", err);
  process.exit(1);
});
