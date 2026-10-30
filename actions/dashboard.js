"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { includes } from "zod";
import { isSupportedCurrency } from "@/lib/currency";

const serializeTransaction = (obj) => {
    const serialized = { ...obj };

    if (obj.balance) {
        serialized.balance = obj.balance.toNumber();
    }

    if (obj.amount) {
        serialized.amount = obj.amount.toNumber();
    }

    return serialized;
}

export async function createAccount(data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: {
                clerkUserId: userId
            }
        });

        const balanceFloat = parseFloat(data.balance);

        if (isNaN(balanceFloat)) throw new Error("Invalid balance");
        if (!isSupportedCurrency(data.currency)) throw new Error("Unsupported currency");

        const existingAccounts = await db.account.findMany({
            where: {
                userId: user.id
            }
        });
        const shouldBeDefault = existingAccounts.length === 0 ? true : data.isDefault;

        // If account should be default, update all other accounts to not be default
        if (shouldBeDefault) {
            await db.account.updateMany({
                where: {
                    userId: user.id,
                    isDefault: true
                },
                data: {
                    isDefault: false
                }
            });
        }

        // Fields listed explicitly so a client can't set anything else (an id, for example)
        const account = await db.account.create({
            data: {
                name: data.name,
                type: data.type,
                currency: data.currency,
                balance: balanceFloat,
                isDefault: shouldBeDefault,
                userId: user.id
            }
        });

        const serializedAccount = serializeTransaction(account);

        revalidatePath("/dashboard");

        return { success: true, data: serializedAccount }

    } catch (error) {
        throw new Error(error.message);
    }
}

export async function getUserAccounts() {
    try {

        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: {
                clerkUserId: userId
            }
        });

        const accounts = await db.account.findMany({
            where: {
                userId: user.id
            },
            // Default account first, then the most recently active. Every transaction mutation updates the
            // account balance, so updatedAt doubles as "last transaction change" without an extra query
            orderBy: [
                { isDefault: "desc" },
                { updatedAt: "desc" }
            ],
            include: {
                _count: {
                    select: {
                        transactions: true,
                    },
                },
            },
        });

        const serializedAccounts = accounts.map(serializeTransaction);

        return serializedAccounts;
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function getDashboardData() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: {
            clerkUserId: userId
        }
    });

    if (!user) throw new Error("User not found");

    // Get all user transactions
    const transactions = await db.transaction.findMany({
        where: {
            userId: user.id
        },
        orderBy: {
            date: "desc"
        },
        include: {
            category: true,
            subcategory: true
        }
    });

    return transactions.map(serializeTransaction);
}