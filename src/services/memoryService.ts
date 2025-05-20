import { Message } from './types';

interface ChatMessage extends Message {
    timestamp: Date;
}

interface ChatHistory {
    [phoneNumber: string]: ChatMessage[];
}

export class MemoryService {
    private static instance: MemoryService;
    private chatHistory: ChatHistory = {};
    private readonly MESSAGE_LIFETIME = 60 * 60 * 1000; // 1 hour in milliseconds

    private constructor() {}

    public static getInstance(): MemoryService {
        if (!MemoryService.instance) {
            MemoryService.instance = new MemoryService();
        }
        return MemoryService.instance;
    }

    public addMessage(phoneNumber: string, role: 'user' | 'assistant', content: string): void {
        if (!this.chatHistory[phoneNumber]) {
            this.chatHistory[phoneNumber] = [];
        }

        this.chatHistory[phoneNumber].push({
            role,
            content,
            timestamp: new Date()
        });
    }

    public getRecentMessages(phoneNumber: string): Message[] {
        const now = new Date();
        const messages = this.chatHistory[phoneNumber] || [];
        
        return messages
            .filter(msg => (now.getTime() - msg.timestamp.getTime()) <= this.MESSAGE_LIFETIME)
            .map(({ role, content }) => ({ role, content }));
    }

    public cleanupOldMessages(): void {
        const now = new Date();
        
        Object.keys(this.chatHistory).forEach(phoneNumber => {
            this.chatHistory[phoneNumber] = this.chatHistory[phoneNumber].filter(
                msg => (now.getTime() - msg.timestamp.getTime()) <= this.MESSAGE_LIFETIME
            );
            
            // Remove empty chat histories
            if (this.chatHistory[phoneNumber].length === 0) {
                delete this.chatHistory[phoneNumber];
            }
        });

        console.log('Cleaned up old messages at:', new Date().toISOString());
    }
}
