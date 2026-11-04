"use server"

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { request } from "@arcjet/next";
import { aj } from "@/lib/arcjet";
import { isTransferCategory } from "@/lib/system-categories";
import { calculateNextRecurringDate, nextOccurrenceAfter } from "@/lib/recurring";

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
        revalidatePath("/accounts");
        revalidatePath(`/account/${transaction.accountId}`);

        return { success: true, data: serializeAmount(transaction) };
    } catch (error) {
        throw new Error(error.message);
    }
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
                    nextRecurringDate: updatedNextRecurringDate(originalTransaction, data),
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
        revalidatePath("/accounts");

        return { success: true, data: serializeAmount(transaction) };
    } catch (error) {
        throw new Error(error.message);
    }

}

// Keeps the stored schedule unless the edit changes it. Recomputing it from the date on every edit put it in the past for
// any transaction older than one interval, so the job booked an extra copy the next night
function updatedNextRecurringDate(original, data) {
    if (!data.isRecurring || !data.recurringInterval) return null;

    const scheduleUnchanged = original.isRecurring
        && original.recurringInterval === data.recurringInterval
        && new Date(original.date).getTime() === new Date(data.date).getTime()
        && original.nextRecurringDate;
    if (scheduleUnchanged) return original.nextRecurringDate;

    // A new schedule starts with the next occurrence still to come: earlier ones may already have copies
    return nextOccurrenceAfter(data.date, data.recurringInterval);
}
