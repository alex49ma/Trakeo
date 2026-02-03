"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { feedbackSchema } from "@/app/lib/schema";

export async function sendFeedback(data) {
    try {
        const { userId } = await auth();

        // We can allow anonymous feedback if userId is null, 
        // but the schema says userId is String? so it can be null.
        // However, usually we want to know who sent it if they are logged in.
        let dbUserId = null;

        if (userId) {
            const user = await db.user.findUnique({ where: { clerkUserId: userId } });
            if (user) {
                dbUserId = user.id;
            }
        }

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
