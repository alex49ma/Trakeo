"use server"

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { request } from "@arcjet/next";
import Big from "big.js";
import { aj } from "@/lib/arcjet";
import { isTransferCategory, NOT_TRANSFER_CATEGORY } from "@/lib/system-categories";

const serializeAmount = (obj) => ({
    ...obj,
    amount: obj.amount.toNumber(),
});

// Only the fields a client may set. Anything else in the request (transferId, userId...) is ignored
const transactionFields = (data) => ({
    type: data.type,
    amount: data.amount,
    description: data.description,
    date: data.date,
    accountId: data.accountId,
    categoryId: data.categoryId,
    subcategoryId: data.subcategoryId || null,
    isRecurring: data.isRecurring,
    recurringInterval: data.recurringInterval,
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

        await assertCategoryOwnership(user.id, data.categoryId, data.subcategoryId);

        const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;

        // Create transaction and update account balance
        const transaction = await db.$transaction(async (tx) => {
            const newTransaction = await tx.transaction.create({
                data: {
                    ...transactionFields(data),
                    userId: user.id,
                    nextRecurringDate:
                        data.isRecurring && data.recurringInterval
                            ? calculateNextRecurringDate(data.date, data.recurringInterval)
                            : null,
                },
            });
            await tx.account.update({
                where: { id: data.accountId },
                data: { balance: { increment: balanceChange } },
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

// Throws unless the category belongs to the user and the subcategory (if any) belongs to that category.
// Transfer categories are reserved for internal transfers
async function assertCategoryOwnership(userId, categoryId, subcategoryId) {
    const category = await db.category.findUnique({ where: { id: categoryId, userId } });
    if (!category) throw new Error("Category not found");
    if (isTransferCategory(category)) throw new Error("This category is only used by internal transfers");

    if (subcategoryId) {
        const subcategory = await db.subcategory.findUnique({ where: { id: subcategoryId, category_id: categoryId } });
        if (!subcategory) throw new Error("Subcategory not found");
    }
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
        if (originalTransaction.transferId) throw new Error("Internal transfers can only be edited from the transfer form");

        const account = await db.account.findUnique({ where: { id: data.accountId, userId: user.id } });
        if (!account) throw new Error("Account not found");

        const accountChanged = originalTransaction.accountId !== data.accountId;
        if (accountChanged && account.currency !== originalTransaction.account.currency) {
            throw new Error("That account uses another currency. Use an internal transfer to move money between currencies");
        }

        await assertCategoryOwnership(user.id, data.categoryId, data.subcategoryId);

        // Decimal math, so the old and new amounts don't pick up float errors when combined
        const oldBalanceChange = originalTransaction.type === "EXPENSE" ? originalTransaction.amount.neg() : originalTransaction.amount;
        const newBalanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;

        const transaction = await db.$transaction(async (tx) => {
            const updated = await tx.transaction.update({
                where: {
                    id,
                    userId: user.id
                },
                data: {
                    ...transactionFields(data),
                    nextRecurringDate:
                        data.isRecurring && data.recurringInterval
                            ? calculateNextRecurringDate(data.date, data.recurringInterval)
                            : null,
                },
            });

            if (accountChanged) {
                // Revert the old amount on the previous account, apply the new one to the target account
                await tx.account.update({
                    where: { id: originalTransaction.accountId },
                    data: { balance: { increment: oldBalanceChange.neg() } },
                });
                await tx.account.update({
                    where: { id: data.accountId },
                    data: { balance: { increment: newBalanceChange } },
                });
            } else {
                await tx.account.update({
                    where: { id: data.accountId },
                    data: { balance: { increment: oldBalanceChange.neg().plus(newBalanceChange) } },
                });
            }

            return updated;

        });

        revalidatePath(`/account/${transaction.accountId}`);
        if (accountChanged) revalidatePath(`/account/${originalTransaction.accountId}`);
        revalidatePath(`/dashboard`);

        return { success: true, data: serializeAmount(transaction) };
    } catch (error) {
        throw new Error(error.message);
    }

}

export async function bulkCreateTransactions(accountId, transactions) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({ where: { clerkUserId: userId } });
        if (!user) throw new Error("User not found");

        const account = await db.account.findUnique({ where: { id: accountId, userId: user.id } });
        if (!account) throw new Error("Account not found");

        const uniqueCategoryNames = [...new Set(transactions.map(t => t.categoryName?.trim()).filter(Boolean))];

        // Fetch existing categories for the user. Transfer categories never match: a CSV row named like one gets a normal category
        const existingCategories = await db.category.findMany({
            where: {
                userId: user.id,
                name: { in: uniqueCategoryNames },
                ...NOT_TRANSFER_CATEGORY,
            },
        });

        // Key: "Name-Type" -> Category
        const existingCategoryMap = new Map(existingCategories.map(c => [`${c.name}-${c.type}`, c]));

        // Identify required categories (Name + Type)
        const requiredCategories = new Map();
        transactions.forEach(t => {
            const name = t.categoryName?.trim();
            const type = t.type;
            if (name && type) {
                requiredCategories.set(`${name}-${type}`, { name, type });
            }
        });

        // Identify missing categories
        const categoriesToCreate = [];
        requiredCategories.forEach((val, key) => {
            if (!existingCategoryMap.has(key)) {
                categoriesToCreate.push(val);
            }
        });

        await db.$transaction(async (tx) => {
            for (const catData of categoriesToCreate) {
                const newCat = await tx.category.create({
                    data: {
                        name: catData.name,
                        type: catData.type,
                        userId: user.id,
                        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                    }
                });
                existingCategoryMap.set(`${newCat.name}-${newCat.type}`, newCat);
            }

            // Summed with big.js so many cent amounts don't add up to a float error in the stored balance
            let netBalanceChange = new Big(0);
            const transactionsToCreate = [];

            for (const t of transactions) {
                const categoryName = t.categoryName?.trim();
                const type = t.type;
                const key = `${categoryName}-${type}`;
                const category = existingCategoryMap.get(key);

                if (!category) {
                    continue;
                }

                transactionsToCreate.push({
                    type: t.type,
                    amount: t.amount,
                    description: t.description,
                    date: new Date(t.date),
                    userId: user.id,
                    accountId: accountId,
                    categoryId: category.id,
                    status: "COMPLETED",
                });

                netBalanceChange = netBalanceChange.plus(t.type === "EXPENSE" ? -t.amount : t.amount);
            }

            if (transactionsToCreate.length > 0) {
                await tx.transaction.createMany({
                    data: transactionsToCreate,
                });
            }

            await tx.account.update({
                where: { id: accountId },
                data: {
                    balance: { increment: netBalanceChange.toString() }
                }
            });
        });

        revalidatePath(`/account/${accountId}`);
        revalidatePath(`/dashboard`);

        return { success: true, count: transactions.length };

    } catch (error) {
        console.error("Bulk create error:", error);
        throw new Error(error.message);
    }
}
