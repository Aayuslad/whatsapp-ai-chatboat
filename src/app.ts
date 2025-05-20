import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { webhookRouter } from "./routes/webhook";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

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
