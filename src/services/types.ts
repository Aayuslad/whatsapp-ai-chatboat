export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface StructuredMessage {
    content: string;
    delaySeconds: number;
}

export interface StructuredResponse {
    messages: StructuredMessage[];
    fallback?: string; // Fallback single message if AI fails to provide structured response
}

export interface OpenRouterResponse {
    choices: Array<{
        message: {
            content: string | StructuredResponse;
        };
    }>;
}
