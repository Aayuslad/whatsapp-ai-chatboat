import axios from "axios";

interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

interface OpenRouterResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

export async function generateAIResponse(userMessage: string): Promise<string> {
	try {
		const messages: Message[] = [
			{
				role: "system",
				content:
					"You are a caring, romantic AI girlfriend. Respond like a real person having a casual conversation with her partner. Keep responses concise and natural.",
			},
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
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
					"HTTP-Referer": "https://github.com/yourusername/your-repo", // Update this
					"Content-Type": "application/json",
				},
			},
		);

		return response.data.choices[0].message.content;
	} catch (error) {
		console.error("Error generating AI response:", error);
		throw new Error("Failed to generate AI response");
	}
}
