import axios from "axios";
import { Message, StructuredResponse, OpenRouterResponse, StructuredMessage } from './types';

export async function generateAIResponse(userMessage: string, messageHistory: Message[] = []): Promise<StructuredResponse> {
    try {
        const systemPrompt = `${process.env.SYSTEM_PROMPT || ''}
You are a helpful AI assistant. Respond naturally to the user's messages.`;

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
                temperature: 0.7,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "chat_response",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                messages: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            content: {
                                                type: "string",
                                                description: "The message content"
                                            },
                                            delaySeconds: {
                                                type: "number",
                                                description: "Delay in seconds before showing this message",
                                                minimum: 0,
                                                maximum: 30
                                            }
                                        },
                                        required: ["content", "delaySeconds"],
                                        additionalProperties: false
                                    }
                                }
                            },
                            required: ["messages"],
                            additionalProperties: false
                        }
                    }
                }
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
                    "Content-Type": "application/json",
                    "x-title": process.env.APP_NAME || "AI Chat App"
                },
                timeout: 30000
            }
        );

        const content = response.data.choices[0].message.content;

		console.log("response data:", JSON.stringify(response.data, null, 2));
        
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
        
        // Handle HTTP errors
        if (error && typeof error === 'object' && 'response' in error) {
            const response = (error as any).response;
            if (response?.status === 401 || response?.status === 403) {
                throw new Error("Authentication failed with OpenRouter. Please check your API key.");
            } else if (response?.status === 400) {
                const errorMessage = response.data?.error?.message || 'Unknown error';
                throw new Error(`Bad request: ${errorMessage}`);
            }
        }

        // Handle timeout errors
        if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'ECONNABORTED') {
            throw new Error("Request timed out. Please try again.");
        }
        
        // Throw the original error if it's an Error instance, otherwise wrap it
        throw error instanceof Error ? error : new Error("Failed to generate AI response");
    }
}
