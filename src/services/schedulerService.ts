import { generateAIResponse } from "./openRouterService";
import twilio from "twilio";
import { Twilio } from "twilio";

interface DailyPlan {
	date: string;
	plannedTimes: number[]; // Store times as minutes since midnight
	sentTimes: number[];
	nightMessageSent: boolean;
}

export class SchedulerService {
	private static instance: SchedulerService;
	private currentPlan: DailyPlan | null = null;
	private client: Twilio;

	private constructor() {
		const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
		const authToken = process.env.TWILIO_AUTH_TOKEN || "";
		this.client = twilio(accountSid, authToken);
		this.generateDailyPlan();
	}

	public static getInstance(): SchedulerService {
		if (!SchedulerService.instance) {
			SchedulerService.instance = new SchedulerService();
		}
		return SchedulerService.instance;
	}

	private getDateString(): string {
		const date = new Date();
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	}

	private getCurrentTimeInMinutes(): number {
		const now = new Date();
		return now.getHours() * 60 + now.getMinutes();
	}

	private generateRandomMinutes(startHour: number, endHour: number): number {
		const startMinutes = startHour * 60;
		const endMinutes = endHour * 60;
		return Math.floor(Math.random() * (endMinutes - startMinutes + 1)) + startMinutes;
	}

	private generateDailyPlan(): void {
		const numMessages = Math.floor(Math.random() * 2) + 2; // 2-3 messages
		const plannedTimes: number[] = [];

		// Generate random times between 10 AM (600 minutes) and 9 PM (1260 minutes)
		for (let i = 0; i < numMessages; i++) {
			plannedTimes.push(this.generateRandomMinutes(10, 21));
		}

		this.currentPlan = {
			date: this.getDateString(),
			plannedTimes: plannedTimes.sort((a, b) => a - b),
			sentTimes: [],
			nightMessageSent: false,
		};

		console.log("Generated daily plan:", {
			date: this.currentPlan.date,
			plannedTimes: this.currentPlan.plannedTimes.map(
				(mins) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`,
			),
		});
	}

	private async sendMessage(isNightMessage: boolean = false): Promise<void> {
		const allowedNumber = process.env.ALLOWED_PHONE_NUMBER;
		if (!allowedNumber) {
			console.error("No allowed phone number configured");
			return;
		}

		try {
			const messages = [
				{
					role: "system" as const,
					content:
						(isNightMessage
							? (process.env.RANDOM_NIGHT_MESSAGE_PROMPT as string)
							: (process.env.RANDOM_DAY_MESSAGE_PROMPT as string)) + (process.env.SYSTEM_PROMPT as string),
				},
			];

			const aiResponse = await generateAIResponse("Send a random message", messages);

			await this.client.messages.create({
				from: "whatsapp:+14155238886",
				body: aiResponse,
				to: `whatsapp:${allowedNumber}`,
			});

			console.log(`Sent ${isNightMessage ? "night" : "scheduled"} message:`, aiResponse);
		} catch (error) {
			console.error("Error sending scheduled message:", error);
		}
	}

	public async checkAndSendMessages(): Promise<void> {
		const currentDate = this.getDateString();
		const currentTimeMinutes = this.getCurrentTimeInMinutes();

		// Reset plan if it's a new day
		if (!this.currentPlan || this.currentPlan.date !== currentDate) {
			this.generateDailyPlan();
			return;
		}

		// Check for planned messages (with 5-minute window)
		const pendingTime = this.currentPlan.plannedTimes.find(
			(time) => !this.currentPlan!.sentTimes.includes(time) && Math.abs(currentTimeMinutes - time) <= 5,
		);

		if (pendingTime) {
			await this.sendMessage();
			this.currentPlan.sentTimes.push(pendingTime);
		}

		// Check for night message (10 PM - 12 AM)
		const hour = Math.floor(currentTimeMinutes / 60);
		if (hour >= 22 && hour < 24 && !this.currentPlan.nightMessageSent) {
			await this.sendMessage(true);
			this.currentPlan.nightMessageSent = true;
		}
	}
}
