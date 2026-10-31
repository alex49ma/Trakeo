import z from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

export const accountSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["CURRENT", "SAVINGS"]),
    currency: z.enum(SUPPORTED_CURRENCIES),
    balance: z.string().optional(), // Empty means 0
    isDefault: z.boolean().default(false),
})

// Server-side check of an internal transfer request. The amounts themselves are validated by resolveExchange
const exchangeValue = z.union([z.string(), z.number()]).optional();

export const transferSchema = z.object({
    fromAccountId: z.string().min(1, "Source account is required"),
    toAccountId: z.string().min(1, "Destination account is required"),
    fromAmount: exchangeValue,
    rate: exchangeValue,
    toAmount: exchangeValue,
    fee: exchangeValue,
    derivedField: z.enum(["FROM_AMOUNT", "RATE", "TO_AMOUNT"]),
    date: z.date({ message: "Date is required" }),
    description: z.string().optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Choose two different accounts",
    path: ["toAccountId"],
})


export const transactionSchema = z.object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.string().min(1, "Amount is required"),
    description: z.string().optional(),
    date: z.date({ required_error: "Date is required" }),
    accountId: z.string().min(1, "Account is required"),
    categoryId: z.string().min(1, "Category is required"),
    subcategoryId: z.string().nullable().optional(),
    isRecurring: z.boolean().default(false),
    recurringInterval: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
}).superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurringInterval) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Recurring interval is required for recurring transactions",
            path: ["recurringInterval"],
        })
    }
})

export const categorySchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["INCOME", "EXPENSE"]),
    color: z.string().min(1, "Color is required").default("#22c55e"),
    icon: z.string().default("Wallet"),
})

export const subcategorySchema = z.object({
    name: z.string().min(1, "Name is required"),
    // categoryId will be passed programmatically, usually
})

export const feedbackSchema = z.object({
    message: z.string().min(5, "Message must be at least 5 characters"),
})
