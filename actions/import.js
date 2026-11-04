"use server";

import { auth } from "@clerk/nextjs/server";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";
import Big from "big.js";
import { db } from "@/lib/prisma";
import { aj } from "@/lib/arcjet";
import { importContextSchema, importSchema } from "@/app/lib/schema";
import { currencyDecimals } from "@/lib/currency";
import { isTransferCategory } from "@/lib/system-categories";

// Expected problems come back as { success: false, error }, where error is a key of CsvImport.errors: a thrown
// message reaches the browser as a generic one in production. Unexpected failures still throw.

const DAY_MS = 86_400_000;

async function currentUser() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) throw new Error("User not found");

    return { user, clerkUserId: userId };
}

const decimalPlaces = (amount) => (amount.split(".")[1] ?? "").replace(/0+$/, "").length;

/**
 * The account's transactions around the file's dates (one day of margin on each side), for the possible-duplicate
 * check that runs in the browser. Amounts as strings, dates as ISO strings.
 */
export async function getImportContext(input) {
    const { user } = await currentUser();

    const parsed = importContextSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalidData" };
    const { accountId, from, to } = parsed.data;

    const account = await db.account.findUnique({ where: { id: accountId, userId: user.id }, select: { id: true } });
    if (!account) return { success: false, error: "accountNotFound" };

    const transactions = await db.transaction.findMany({
        where: {
            accountId,
            userId: user.id,
            date: { gte: new Date(from.getTime() - DAY_MS), lt: new Date(to.getTime() + 2 * DAY_MS) },
        },
        select: {
            id: true,
            date: true,
            type: true,
            amount: true,
            description: true,
            category: { select: { name: true, systemKey: true } },
        },
        orderBy: { date: "asc" },
    });

    return {
        success: true,
        existing: transactions.map((transaction) => ({
            ...transaction,
            date: transaction.date.toISOString(),
            amount: transaction.amount.toString(),
        })),
    };
}

/**
 * Saves the rows the user ticked in the import preview: the transactions and the balance change, in one database
 * transaction. Their categories already exist (the wizard creates new ones through the category drawers). Nothing is saved when any check fails.
 */
export async function importTransactions(input) {
    const { user, clerkUserId } = await currentUser();

    const req = await request();
    const decision = await aj.protect({ req, userId: clerkUserId, requested: 1 });
    if (decision.isDenied()) return { success: false, error: "blocked" };

    const parsed = importSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalidData" };
    const { accountId, rows } = parsed.data;

    const account = await db.account.findUnique({ where: { id: accountId, userId: user.id } });
    if (!account) return { success: false, error: "accountNotFound" };

    const decimals = currencyDecimals(account.currency);
    if (rows.some((row) => decimalPlaces(row.amount) > decimals)) return { success: false, error: "invalidData" };

    // Existing categories: the user's, not a transfer one, and of the row's type
    const categoryIds = [...new Set(rows.map((row) => row.categoryId))];
    const categories = await db.category.findMany({
        where: { id: { in: categoryIds }, userId: user.id },
        select: { id: true, type: true, systemKey: true },
    });
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    for (const row of rows) {
        const category = categoryById.get(row.categoryId);
        if (!category || isTransferCategory(category)) return { success: false, error: "categoryNotFound" };
        if (category.type !== row.type) return { success: false, error: "categoryTypeMismatch" };
    }

    // Subcategories have no userId: scoped through their category, and each must belong to its row's category
    const subcategoryIds = [...new Set(rows.map((row) => row.subcategoryId).filter(Boolean))];
    const subcategories = subcategoryIds.length > 0
        ? await db.subcategory.findMany({
            where: { id: { in: subcategoryIds }, category: { userId: user.id } },
            select: { id: true, category_id: true },
        })
        : [];
    const subcategoryById = new Map(subcategories.map((subcategory) => [subcategory.id, subcategory]));
    for (const row of rows) {
        if (!row.subcategoryId) continue;
        if (subcategoryById.get(row.subcategoryId)?.category_id !== row.categoryId) return { success: false, error: "categoryNotFound" };
    }

    let netChange = new Big(0);
    const transactions = rows.map((row) => {
        netChange = row.type === "EXPENSE" ? netChange.minus(row.amount) : netChange.plus(row.amount);
        return {
            type: row.type,
            amount: row.amount,
            description: row.description,
            date: row.date,
            userId: user.id,
            accountId: account.id,
            categoryId: row.categoryId,
            subcategoryId: row.subcategoryId ?? null,
            status: "COMPLETED",
        };
    });

    await db.$transaction(async (tx) => {
        await tx.transaction.createMany({ data: transactions });
        await tx.account.update({
            where: { id: account.id, userId: user.id },
            data: { balance: { increment: netChange.toString() } },
        });
    }, { timeout: 15_000 });

    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    revalidatePath(`/account/${account.id}`);

    return { success: true, created: transactions.length };
}
