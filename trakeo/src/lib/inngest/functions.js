import { inngest } from "./client";
import { db } from "@/lib/prisma";

export const triggerRecurringTransactions = inngest.createFunction(
    { id: "trigger-recurring-transactions", name: "Trigger Recurring Transactions" },
    { cron: "0 0 * * *" },
    async ({ step }) => {
        // 1. Fetch recurring transactions
        const recurringTransactions = await step.run("fetch-recurring-transactions", async () => {
            return await db.transaction.findMany({
                where: {
                    isRecurring: true,
                    status: "COMPLETED",
                    OR: [
                        { lastProcessed: null }, // Never processed
                        { nextRecurringDate: { lte: new Date() } } // Due date passed
                    ],
                },
            });
        });

        // 2. Create events
        if (recurringTransactions.length > 0) {
            const events = recurringTransactions.map((transaction) => ({
                name: "transaction.recurring.process",
                data: {
                    transactionId: transaction.id,
                    userId: transaction.userId,
                }
            }));

            // 3. Send events
            await inngest.send(events);
        }
        return { triggered: recurringTransactions.length }
    },
);


export const processRecurringTransaction = inngest.createFunction({
    id: "process-recurring-transaction",
    throttle: {
        limit: 10,
        period: "1m",
        key: "event.data.userId",
    },
},
    { event: "transaction.recurring.process" },
    async ({ event, step }) => {
        // Validating event data
        if (!event?.data?.transactionId || !event?.data?.userId) {
            console.error("Invalid event data:", event);
            return { error: "Missing required event data" };
        }

        await step.run("process-transaction", async () => {
            const transaction = await db.transaction.findUnique({
                where: {
                    id: event.data.transactionId,
                    userId: event.data.userId,
                },
                include: {
                    account: true,
                },
            });
            if (!transaction || !isTransactionDue(transaction)) return;

            await db.$transaction(async (tx) => {
                await tx.transaction.create({
                    data: {
                        type: transaction.type,
                        amount: transaction.amount,
                        description: `${transaction.description} (Recurring)`,
                        date: new Date(),
                        categoryId: transaction.categoryId,
                        subcategoryId: transaction.subcategoryId,
                        userId: transaction.userId,
                        accountId: transaction.accountId,
                        isRecurring: false,
                    }
                });

                // Update balance
                const balanceChange = transaction.type === "EXPENSE"
                    ? -transaction.amount.toNumber()
                    : transaction.amount.toNumber();

                await tx.account.update({
                    where: { id: transaction.accountId },
                    data: { balance: { increment: balanceChange } },
                });

                // Update last processed date
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        lastProcessed: new Date(),
                        nextRecurringDate: calculateNextRecurringDate(new Date(), transaction.recurringInterval),
                    },
                });
            });
        });
    }
);

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

function isTransactionDue(transaction) {
    if (!transaction.lastProcessed) return true;
    const today = new Date();
    const nextDueDate = new Date(transaction.nextRecurringDate);
    return nextDueDate <= today;
}
