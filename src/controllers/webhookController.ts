import { Request, Response } from 'express';
import twilio from 'twilio';
import { Twilio } from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const client: Twilio = twilio(accountSid, authToken);

export const handleIncomingMessage = async (req: Request, res: Response) => {
    try {
        const { Body: messageBody, From: senderNumber } = req.body;
        console.log('Incoming message:', { messageBody, senderNumber });

        const allowedPhoneNumber = process.env.ALLOWED_PHONE_NUMBER;

        if (senderNumber === allowedPhoneNumber) {
            // Respond to allowed number with a loving message
            await client.messages.create({
                from: 'whatsapp:+14155238886', // Your Twilio WhatsApp number
                body: 'Hi love 💬 I miss you!',
                to: `whatsapp:${allowedPhoneNumber}`
            });

            res.status(200).json({ status: 'success', message: 'Message sent successfully' });
        } else {
            // Respond to unauthorized numbers
            console.log('Unauthorized access attempt from:', senderNumber);
            res.status(403).json({ status: 'error', message: 'Unauthorized' });
        }
    } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
