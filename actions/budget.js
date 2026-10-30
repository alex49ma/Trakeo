"use server"

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth } from "date-fns";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { COUNTS_IN_TOTALS_CATEGORY } from "@/lib/system-categories";

export async function getCurrentBudget(accountId) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: {
                clerkUserId: userId
            }
        });

        if (!user) throw new Error("User not found");

        const account = await db.account.findUnique({ where: { id: accountId, userId: user.id } });
        if (!account) throw new Error("Account not found");

        const budget = await db.budget.findFirst({
            where: {
                userId: user.id,
            },
        });

        const currentDate = new Date();
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);

        const expenses = await db.transaction.aggregate({
            where: {
                userId: user.id,
                type: "EXPENSE",
                date: {
                    gte: monthStart,
                    lte: monthEnd,
                },
                accountId,
                // Internal transfers aren't spending, their fees are
                category: COUNTS_IN_TOTALS_CATEGORY,
            },
            _sum: {
                amount: true,
            },
        });

        return {
            budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
            currentExpenses: expenses._sum.amount ? expenses._sum.amount.toNumber() : 0,
            accountCurrency: account.currency,
        }
    } catch (error) {
        console.error("Error fetching current budget:", error);
        throw error;
    }
}

export async function updateBudget(amount) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: {
                clerkUserId: userId
            }
        });

        if (!user) throw new Error("User not found");

        // The budget is always in the default account's currency
        const defaultAccount = await db.account.findFirst({ where: { userId: user.id, isDefault: true } });
        const currency = defaultAccount?.currency ?? DEFAULT_CURRENCY;

        const budget = await db.budget.upsert({
            where: {
                userId: user.id,
            },
            update: {
                amount,
                currency,
            },
            create: {
                userId: user.id,
                amount,
                currency,
            },
        });

        revalidatePath("/dashboard");
        return { success: true, data: { ...budget, amount: budget.amount.toNumber() } }

    }

    catch (error) {
        console.error("Error updating budget:", error);
        throw error;
    }

}