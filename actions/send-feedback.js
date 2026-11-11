"use server";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { feedbackSchema } from "@/app/lib/schema";

export async function sendFeedback(data) {
    try {
        // Feedback can be anonymous (Feedback.userId is optional), but a signed-in sender is recorded
        const user = await getCurrentUser();
        const dbUserId = user?.id ?? null;

        const parsed = feedbackSchema.safeParse(data);
        if (!parsed.success) {
            throw new Error(parsed.error.message);
        }

        await db.feedback.create({
            data: {
                message: parsed.data.message,
                userId: dbUserId,
                // created_at and updated_at are handled by default
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error sending feedback:", error);
        return { success: false, error: "Failed to send feedback" };
    }
}
