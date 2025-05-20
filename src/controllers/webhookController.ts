import { Request, Response } from "express";
import twilio from "twilio";
import { Twilio } from "twilio";
import { generateAIResponse } from "../services/openRouterService";
import { MemoryService } from "../services/memoryService";

// Initialize services
const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const client: Twilio = twilio(accountSid, authToken);
const memoryService = MemoryService.getInstance();

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

                // Store AI response
                memoryService.addMessage(allowedPhoneNumber, 'assistant', aiResponse);

                // Send the AI response back via WhatsApp
                await client.messages.create({
                    from: "whatsapp:+14155238886",
                    body: aiResponse,
                    to: `whatsapp:${allowedPhoneNumber}`,
                });

                res.status(200).json({ status: "success", message: "AI response sent successfully" });
            } catch (aiError) {
                console.error("AI Response Error:", aiError);
                // Fallback message in case of AI service failure
                await client.messages.create({
                    from: "whatsapp:+14155238886",
                    body: "Sorry, I'm having trouble thinking right now. Can you try again in a moment? 💭",
                    to: `whatsapp:${allowedPhoneNumber}`,
                });
                res.status(200).json({ status: "success", message: "Fallback message sent" });
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
