import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { webhookRouter } from "./routes/webhook";
import { MemoryService } from "./services/memoryService";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Initialize memory service
const memoryService = MemoryService.getInstance();

// Setup cleanup cron job (runs every 5 minutes)
cron.schedule("*/5 * * * *", () => {
	memoryService.cleanupOldMessages();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
	res.send("Server is running 😎");
});
app.use("/webhook", webhookRouter);

export default app;
