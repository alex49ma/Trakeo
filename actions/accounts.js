"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth } from "date-fns";
import { COUNTS_IN_TOTALS_CATEGORY } from "@/lib/system-categories";

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

const serializeTransfer = (transfer) => transfer && ({
    ...transfer,
    fromAmount: transfer.fromAmount.toNumber(),
    fee: transfer.fee.toNumber(),
    rate: transfer.rate.toNumber(),
    toAmount: transfer.toAmount.toNumber(),
});

export async function updateDefaultAccount(accountId) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: {
                clerkUserId: userId
            }
        });

        if (!user) throw new Error("User not found");


        await db.account.updateMany({
            where: {
                userId: user.id,
                isDefault: true
            },
            data: {
                isDefault: false
            }
        });

        const account = await db.account.update({
            where: {
                id: accountId,
                userId: user.id
            },
            data: {
                isDefault: true
            }
        });

        revalidatePath("/dashboard")
        revalidatePath("/accounts")
        return { success: true, data: serializeTransaction(account) }
    } catch (error) {
        return { success: false, error: error.message }
    }

}

// Every account plus this month's income and expenses in its own currency (monthIncome, monthExpense), for the
// accounts page. Same month bounds and filter as the budget: internal transfers aren't income or spending, their fees are
export async function getAccountsOverview() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: {
            clerkUserId: userId
        }
    });

    if (!user) throw new Error("User not found");

    const now = new Date();
    const [accounts, monthTotals] = await Promise.all([
        db.account.findMany({
            where: { userId: user.id },
            orderBy: [
                { isDefault: "desc" },
                { updatedAt: "desc" }
            ],
        }),
        db.transaction.groupBy({
            by: ["accountId", "type"],
            where: {
                userId: user.id,
                date: { gte: startOfMonth(now), lte: endOfMonth(now) },
                category: COUNTS_IN_TOTALS_CATEGORY,
            },
            _sum: { amount: true },
        }),
    ]);

    const monthTotal = (accountId, type) =>
        monthTotals.find((row) => row.accountId === accountId && row.type === type)?._sum.amount?.toNumber() ?? 0;

    return accounts.map((account) => ({
        ...serializeTransaction(account),
        monthIncome: monthTotal(account.id, "INCOME"),
        monthExpense: monthTotal(account.id, "EXPENSE"),
    }));
}

export async function getAccountWithTransactions(accountId) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: {
                clerkUserId: userId
            }
        });

        if (!user) throw new Error("User not found");

        const account = await db.account.findUnique({
            where: {
                id: accountId,
                userId: user.id
            },
            include: {
                transactions: {
                    orderBy: {
                        date: "desc"
                    },
                    include: {
                        category: true,
                        subcategory: true,
                        transfer: {
                            include: {
                                fromAccount: { select: { id: true, name: true, currency: true } },
                                toAccount: { select: { id: true, name: true, currency: true } },
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        transactions: true,
                    },
                },
            }
        });

        if (!account) return null;

        return {
            ...serializeTransaction(account),
            transactions: account.transactions.map((transaction) => ({
                ...serializeTransaction(transaction),
                transfer: serializeTransfer(transaction.transfer),
            }))
        }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

export async function bulkDeleteTransactions(transactionIds) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: {
                clerkUserId: userId
            }
        });

        if (!user) throw new Error("User not found");

        // Deleting any transaction of an internal transfer deletes the whole transfer, in both accounts
        const selected = await db.transaction.findMany({
            where: {
                id: {
                    in: transactionIds
                },
                userId: user.id
            },
            select: { transferId: true }
        });
        const transferIds = [...new Set(selected.map((transaction) => transaction.transferId).filter(Boolean))];

        const transactions = await db.transaction.findMany({
            where: {
                userId: user.id,
                OR: [
                    { id: { in: transactionIds } },
                    { transferId: { in: transferIds } }
                ]
            }
        });

        // Summed as Decimals so the stored balances don't pick up float errors
        const accountBalanceChanges = transactions.reduce((acc, transaction) => {
            const change = transaction.type === "EXPENSE"
                ? transaction.amount
                : transaction.amount.neg();

            acc[transaction.accountId] = acc[transaction.accountId] ? acc[transaction.accountId].plus(change) : change;
            return acc;
        }, {});

        await db.$transaction(async (tx) => {
            await tx.transaction.deleteMany({
                where: {
                    id: {
                        in: transactions.map((transaction) => transaction.id)
                    },
                    userId: user.id
                }
            });
            if (transferIds.length > 0) {
                await tx.transfer.deleteMany({
                    where: { id: { in: transferIds }, userId: user.id }
                });
            }
            for (const [accountId, balanceChange] of Object.entries(accountBalanceChanges)) {
                await tx.account.update({
                    where: {
                        id: accountId
                    },
                    data: {
                        balance: {
                            increment: balanceChange
                        }
                    }
                })
            }
        })

        for (const accountId of Object.keys(accountBalanceChanges)) {
            revalidatePath(`/account/${accountId}`)
        }
        revalidatePath("/dashboard")
        revalidatePath("/accounts")

        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}