import { Request, Response } from "express";
import twilio from "twilio";
import type { Twilio } from "twilio";
import { generateAIResponse } from "../services/openRouterService";
import { MemoryService } from "../services/memoryService";
import { StructuredMessage } from "../services/types";

// Initialize services
const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const client: Twilio = twilio(accountSid, authToken);
const memoryService = MemoryService.getInstance();

// Helper function to send delayed message
async function sendDelayedMessage(message: StructuredMessage, toNumber: string): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(async () => {
            try {
                await client.messages.create({
                    from: "whatsapp:+14155238886",
                    body: message.content,
                    to: `whatsapp:${toNumber}`,
                });
                console.log(`Sent delayed message after ${message.delaySeconds} seconds`);
            } catch (error) {
                console.error("Error sending delayed message:", error);
            }
            resolve();
        }, message.delaySeconds * 1000);
    });
}

export const handleIncomingMessage = async (req: Request, res: Response) => {
    try {
        const { Body: messageBody, From: senderNumber } = req.body;
        console.log("Incoming message:", { messageBody, senderNumber });

        const allowedPhoneNumber = process.env.ALLOWED_PHONE_NUMBER;

        if (!allowedPhoneNumber || !messageBody) {
            console.error("Missing required environment variables or message body");
            res.status(400).json({ status: "error", message: "Missing required data" });
            return;
        }

        if (senderNumber === `whatsapp:${allowedPhoneNumber}`) {
            try {
                // Store user message
                memoryService.addMessage(allowedPhoneNumber, 'user', messageBody);

                // Get recent message history
                const messageHistory = memoryService.getRecentMessages(allowedPhoneNumber);

                // Generate AI response with context
                const aiResponse = await generateAIResponse(messageBody, messageHistory);

                // Store all AI responses
                aiResponse.messages.forEach(msg => {
                    memoryService.addMessage(allowedPhoneNumber, 'assistant', msg.content);
                });

                // Start sending messages with delays
                aiResponse.messages.forEach(message => {
                    sendDelayedMessage(message, allowedPhoneNumber);
                });

                res.status(200).json({ 
                    status: "success", 
                    message: "AI responses scheduled for delivery",
                    numberOfMessages: aiResponse.messages.length
                });
            } catch (aiError) {
                console.error("AI Response Error:", aiError);
                res.status(500).json({ 
                    status: "error", 
                    message: "Failed to generate AI response" 
                });
            }
        } else {
            // Respond to unauthorized numbers
            console.log("Unauthorized access attempt from:", senderNumber);
            res.status(403).json({ status: "error", message: "Unauthorized" });
        }
    } catch (error) {
        console.error("Error handling message:", error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};
