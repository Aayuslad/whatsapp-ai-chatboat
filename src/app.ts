import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { webhookRouter } from "./routes/webhook";
import { MemoryService } from "./services/memoryService";
import { SchedulerService } from "./services/schedulerService";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Initialize services
const memoryService = MemoryService.getInstance();
const schedulerService = SchedulerService.getInstance();

// Setup cleanup cron job (runs every 5 minutes)
cron.schedule("*/5 * * * *", () => {
    memoryService.cleanupOldMessages();
}, {
    timezone: "Asia/Kolkata" // Run in IST
});

// Main message check every 30 minutes
cron.schedule("*/30 * * * *", () => {
    schedulerService.checkAndSendMessages();
}, {
    timezone: "Asia/Kolkata" // Run in IST
});

// More frequent checks during night hours (every 15 minutes from 10 PM to midnight IST)
cron.schedule("*/15 22-23 * * *", () => {
    schedulerService.checkAndSendMessages();
}, {
    timezone: "Asia/Kolkata" // Run in IST
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
