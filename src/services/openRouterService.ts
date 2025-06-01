import axios from "axios";
import { Message, StructuredResponse, OpenRouterResponse, StructuredMessage } from './types';

export async function generateAIResponse(userMessage: string, messageHistory: Message[] = []): Promise<StructuredResponse> {
    try {
        const systemPrompt = `${process.env.SYSTEM_PROMPT || ''}
You must respond in this JSON format:
{
    "messages": [
        {
            "content": "your message here",
            "delaySeconds": number (delay before sending this message)
        }
    ]
}
Each message will be sent after its specified delay. Keep delays reasonable (5-30 seconds).`;

        const messages: Message[] = [
            {
                role: "system",
                content: systemPrompt
            },
            ...messageHistory,
            {
                role: "user",
                content: userMessage,
            },
        ];

        const response = await axios.post<OpenRouterResponse>(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: process.env.AI_MODEL || "meta-llama/llama-3.3-8b-instruct:free",
                messages: messages,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://github.com/yourusername/your-repo",
                    "Content-Type": "application/json",
                },
            },
        );

        const content = response.data.choices[0].message.content;
        
        // Try to parse the response as structured content
        try {
            const structuredContent = typeof content === 'string' ? JSON.parse(content) : content;
            
            // Validate the structure
            if (Array.isArray(structuredContent.messages) && 
                structuredContent.messages.every((m: StructuredMessage) => 
                    typeof m.content === 'string' && 
                    typeof m.delaySeconds === 'number' && 
                    m.delaySeconds >= 0
                )) {
                return structuredContent;
            }
            
            // If structure is invalid, create a single message response
            throw new Error('Invalid message structure');
        } catch (parseError) {
            // If parsing fails or structure is invalid, return a single message
            console.warn('Failed to parse structured response, falling back to single message');
            const fallbackContent = typeof content === 'string' ? content : JSON.stringify(content);
            return {
                messages: [{
                    content: fallbackContent,
                    delaySeconds: 0
                }],
                fallback: 'Structured response failed, falling back to single message'
            };
        }
    } catch (error) {
        console.error("Error generating AI response:", error);
        throw new Error("Failed to generate AI response");
    }
}
