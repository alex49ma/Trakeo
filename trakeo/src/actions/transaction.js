"use server"

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { request } from "@arcjet/next";
import aj from "@/lib/arcjet";

const serializeAmount = (obj) => ({
    ...obj,
    amount: obj.amount.toNumber(),
});

export async function createTransaction(data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        //Get request data for Arcjet
        const req = await request();
        const decision = await aj.protect({ req, userId, requested: 1 });

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                const { remaining, reset } = decision.reason;
                throw new Error("Too many requests. Please try again later.");
            }
            throw new Error("Request blocked.");
        }

        const user = await db.user.findUnique({ where: { clerkUserId: userId } });
        if (!user) throw new Error("User not found");

        const account = await db.account.findUnique({ where: { id: data.accountId, userId: user.id } });

        if (!account) throw new Error("Account not found");

        const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
        const newBalance = account.balance.toNumber() + balanceChange;

        if (data.subcategoryId === "") {
            data.subcategoryId = null;
        }

        // Create transaction and update account balance
        const transaction = await db.$transaction(async (tx) => {
            const newTransaction = await tx.transaction.create({
                data: {
                    ...data,
                    userId: user.id,
                    nextRecurringDate:
                        data.isRecurring && data.recurringInterval
                            ? calculateNextRecurringDate(data.date, data.recurringInterval)
                            : null,
                },
            });
            await tx.account.update({
                where: { id: data.accountId },
                data: { balance: newBalance },
            });

            return newTransaction;
        });

        revalidatePath("/dashboard");
        revalidatePath(`/account/${transaction.accountId}`);

        return { success: true, data: serializeAmount(transaction) };
    } catch (error) {
        throw new Error(error.message);
    }
}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
    const date = new Date(startDate);

    switch (interval) {
        case "DAILY":
            date.setDate(date.getDate() + 1);
            break;
        case "WEEKLY":
            date.setDate(date.getDate() + 7);
            break;
        case "MONTHLY":
            date.setMonth(date.getMonth() + 1);
            break;
        case "YEARLY":
            date.setFullYear(date.getFullYear() + 1);
            break;
    }

    return date;
}

export async function getTransaction(id) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) throw new Error("User not found");

    const transaction = await db.transaction.findUnique({ where: { id, userId: user.id } });
    if (!transaction) throw new Error("Transaction not found");

    return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({ where: { clerkUserId: userId } });
        if (!user) throw new Error("User not found");

        const originalTransaction = await db.transaction.findUnique({
            where: {
                id,
                userId: user.id,
            },
            include: {
                account: true,
            },
        });

        if (!originalTransaction) throw new Error("Transaction not found");

        const oldBalanceChange = originalTransaction.type === "EXPENSE" ? -originalTransaction.amount : originalTransaction.amount;
        const newBalanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
        const netBalanceChange = newBalanceChange - oldBalanceChange;

        if (data.subcategoryId === "") {
            data.subcategoryId = null;
        }

        const transaction = await db.$transaction(async (tx) => {
            const updated = await tx.transaction.update({
                where: {
                    id,
                    userId: user.id
                },
                data: {
                    ...data,
                    nextRecurringDate:
                        data.isRecurring && data.recurringInterval
                            ? calculateNextRecurringDate(data.date, data.recurringInterval)
                            : null,
                },
            });

            await tx.account.update({
                where: { id: data.accountId },
                data: {
                    balance:
                    {
                        increment: netBalanceChange,
                    },
                },
            });

            return updated;

        });

        revalidatePath(`/account/${transaction.accountId}`);
        revalidatePath(`/dashboard`);

        return { success: true, data: serializeAmount(transaction) };
    } catch (error) {
        throw new Error(error.message);
    }

}
