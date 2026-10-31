"use server"

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { request } from "@arcjet/next";
import Big from "big.js";
import { aj } from "@/lib/arcjet";
import { transferSchema } from "@/app/lib/schema";
import { currencyDecimals } from "@/lib/currency";
import { DERIVED_FIELD_NAME, resolveExchange } from "@/lib/exchange";
import { TRANSFER_CATEGORY_KEYS } from "@/lib/system-categories";

const serializeTransfer = (transfer) => ({
    ...transfer,
    fromAmount: transfer.fromAmount.toNumber(),
    fee: transfer.fee.toNumber(),
    rate: transfer.rate.toNumber(),
    toAmount: transfer.toAmount.toNumber(),
});

const EXCHANGE_ERRORS = {
    required: "Enter two of amount deducted, exchange rate and amount received",
    invalidNumber: "Invalid number",
    mustBePositive: "Amounts and rates must be greater than zero",
    tooManyDecimals: "Too many decimals for this currency",
    feeNegative: "The fee can't be negative",
    feeTooHigh: "The fee must be lower than the amount deducted",
    resultTooSmall: "The calculated value is too small",
};

async function getUser() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) throw new Error("User not found");

    return user;
}

// Checks the request against the user's own accounts and recalculates the exchange values on the server
async function prepareTransfer(userId, data) {
    const parsed = transferSchema.safeParse(data);
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    const input = parsed.data;

    const [fromAccount, toAccount] = await Promise.all([
        db.account.findUnique({ where: { id: input.fromAccountId, userId } }),
        db.account.findUnique({ where: { id: input.toAccountId, userId } }),
    ]);
    if (!fromAccount || !toAccount) throw new Error("Account not found");

    const fromDecimals = currencyDecimals(fromAccount.currency);
    const values = resolveExchange({
        fromAmount: input.fromAmount,
        rate: input.rate,
        toAmount: input.toAmount,
        fee: input.fee,
        derivedField: DERIVED_FIELD_NAME[input.derivedField],
        // Same currency means rate 1, whatever the request says
        sameCurrency: fromAccount.currency === toAccount.currency,
        fromDecimals,
        toDecimals: currencyDecimals(toAccount.currency),
    });
    if (values.error) throw new Error(EXCHANGE_ERRORS[values.error.code]);

    const categories = await db.category.findMany({ where: { userId, systemKey: { in: TRANSFER_CATEGORY_KEYS } } });
    const categoryIds = Object.fromEntries(categories.map((category) => [category.systemKey, category.id]));
    if (TRANSFER_CATEGORY_KEYS.some((key) => !categoryIds[key])) throw new Error("Transfer categories not found");

    return {
        transferData: {
            fromAccountId: fromAccount.id,
            toAccountId: toAccount.id,
            fromAmount: values.fromAmount,
            fee: values.fee,
            rate: values.rate,
            toAmount: values.toAmount,
            derivedField: values.derivedField,
            date: input.date,
            description: input.description || null,
        },
        categoryIds,
        fromDecimals,
    };
}

// The transactions a transfer shows in its accounts: outgoing (plus the fee, if any) in the source, incoming in the destination
function buildTransactions(transferId, userId, { transferData, categoryIds, fromDecimals }) {
    const common = { userId, transferId, date: transferData.date, description: transferData.description };
    const fee = new Big(transferData.fee);

    const transactions = [
        {
            ...common,
            type: "EXPENSE",
            amount: new Big(transferData.fromAmount).minus(fee).toFixed(fromDecimals),
            accountId: transferData.fromAccountId,
            categoryId: categoryIds.TRANSFER_OUT,
        },
        {
            ...common,
            type: "INCOME",
            amount: transferData.toAmount,
            accountId: transferData.toAccountId,
            categoryId: categoryIds.TRANSFER_IN,
        },
    ];

    if (fee.gt(0)) {
        transactions.push({
            ...common,
            type: "EXPENSE",
            amount: fee.toFixed(fromDecimals),
            accountId: transferData.fromAccountId,
            categoryId: categoryIds.TRANSFER_FEE,
        });
    }

    return transactions;
}

// direction 1 applies a transfer to both balances, -1 reverts it
async function moveBalances(tx, transfer, direction) {
    const fromAmount = new Big(transfer.fromAmount.toString());
    const toAmount = new Big(transfer.toAmount.toString());

    await tx.account.update({
        where: { id: transfer.fromAccountId },
        data: { balance: { increment: fromAmount.times(-direction).toString() } },
    });
    await tx.account.update({
        where: { id: transfer.toAccountId },
        data: { balance: { increment: toAmount.times(direction).toString() } },
    });
}

function revalidateTransferPaths(transfer) {
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    revalidatePath(`/account/${transfer.fromAccountId}`);
    revalidatePath(`/account/${transfer.toAccountId}`);
}

export async function createTransfer(data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        //Get request data for Arcjet
        const req = await request();
        const decision = await aj.protect({ req, userId, requested: 1 });
        if (decision.isDenied()) throw new Error("Request blocked.");

        const user = await getUser();
        const prepared = await prepareTransfer(user.id, data);

        // Create the transfer, its transactions and both balance changes together
        const transfer = await db.$transaction(async (tx) => {
            const created = await tx.transfer.create({ data: { ...prepared.transferData, userId: user.id } });
            await tx.transaction.createMany({ data: buildTransactions(created.id, user.id, prepared) });
            await moveBalances(tx, created, 1);

            return created;
        });

        revalidateTransferPaths(transfer);

        return { success: true, data: serializeTransfer(transfer) };
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function getTransfer(id) {
    const user = await getUser();

    const transfer = await db.transfer.findUnique({ where: { id, userId: user.id } });

    return transfer ? serializeTransfer(transfer) : null;
}

export async function updateTransfer(id, data) {
    try {
        const user = await getUser();

        const original = await db.transfer.findUnique({ where: { id, userId: user.id } });
        if (!original) throw new Error("Transfer not found");

        const prepared = await prepareTransfer(user.id, data);

        // Revert the old transfer, then write it again with the new values
        const transfer = await db.$transaction(async (tx) => {
            await moveBalances(tx, original, -1);
            await tx.transaction.deleteMany({ where: { transferId: id, userId: user.id } });

            const updated = await tx.transfer.update({ where: { id, userId: user.id }, data: prepared.transferData });
            await tx.transaction.createMany({ data: buildTransactions(id, user.id, prepared) });
            await moveBalances(tx, updated, 1);

            return updated;
        });

        revalidateTransferPaths(original);
        revalidateTransferPaths(transfer);

        return { success: true, data: serializeTransfer(transfer) };
    } catch (error) {
        throw new Error(error.message);
    }
}
