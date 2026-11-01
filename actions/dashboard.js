"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { includes } from "zod";
import { isSupportedCurrency } from "@/lib/currency";
import { hasExchangeRates } from "@/lib/fx/rates";
import { convertBalances, resolveReportingCurrency, withReportingAmounts } from "@/lib/fx/report";

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

        // The initial balance is optional: an empty field means 0
        const balanceInput = String(data.balance ?? "").trim();
        const balanceFloat = balanceInput === "" ? 0 : parseFloat(balanceInput);

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
        revalidatePath("/accounts");

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

// Every transaction, plus its amount in the default account's currency (reportingAmount) for the analytics
// "All accounts" view. hasRates is false until the exchange rates job has run once
export async function getAnalyticsData() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) throw new Error("User not found");

    const [accounts, transactions, hasRates] = await Promise.all([
        db.account.findMany({ where: { userId: user.id }, select: { id: true, currency: true, isDefault: true } }),
        db.transaction.findMany({
            where: { userId: user.id },
            orderBy: { date: "desc" },
            include: { category: true, subcategory: true },
        }),
        hasExchangeRates(),
    ]);

    const reportingCurrency = resolveReportingCurrency(accounts);
    const accountCurrency = Object.fromEntries(accounts.map((account) => [account.id, account.currency]));
    const converted = await withReportingAmounts(transactions, accountCurrency, reportingCurrency);

    return { transactions: converted.map(serializeTransaction), reportingCurrency, hasRates };
}

// The balance of every account added up in the default account's currency, at the newest exchange rates.
// Null with fewer than two accounts, where the account card already shows the total
export async function getTotalBalance() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) throw new Error("User not found");

    const accounts = await db.account.findMany({
        where: { userId: user.id },
        select: { currency: true, balance: true, isDefault: true },
    });
    if (accounts.length < 2) return null;

    return convertBalances(accounts, resolveReportingCurrency(accounts));
}