import z from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { IMPORT_MAX_DESCRIPTION, IMPORT_MAX_ROWS, IMPORT_MAX_SETTINGS_NAME } from "@/lib/csv-import/limits";
import { ENCODINGS } from "@/lib/csv-import/decode";
import { DATE_FORMATS } from "@/lib/csv-import/parse";

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

// CSV import (actions/import.js). The browser reads the file; the server checks every row it sends
const transactionType = z.enum(["INCOME", "EXPENSE"]);
const IMPORT_EARLIEST_DATE = new Date("1900-01-01T00:00:00Z");
const DAY_MS = 86_400_000;

export const importContextSchema = z.object({
    accountId: z.string().min(1),
    from: z.date(),
    to: z.date(),
}).refine((data) => data.from <= data.to);

// One row: a positive amount (its account currency's decimals are checked in the action) and an existing category,
// with an optional subcategory. The wizard creates new categories through the category drawers before the import
const importRowSchema = z.object({
    date: z.date().min(IMPORT_EARLIEST_DATE).refine((date) => date.getTime() <= Date.now() + DAY_MS),
    amount: z.string().regex(/^\d+(\.\d+)?$/).refine((amount) => !/^0+(\.0+)?$/.test(amount)),
    type: transactionType,
    description: z.string().max(IMPORT_MAX_DESCRIPTION),
    categoryId: z.string().min(1),
    subcategoryId: z.string().min(1).nullable().optional(),
});

// Saved import settings (ImportProfile.settings), checked when they're saved and when they're read back.
// Columns by header name, or "#3" for a column without one (lib/csv-import/signature.js)
const settingsColumn = z.string().min(1).max(200);
export const importSettingsSchema = z.object({
    version: z.literal(1),
    encoding: z.enum(["auto", ...ENCODINGS]),
    // The same as DELIMITERS in lib/csv-import/table.js, which isn't imported so papaparse stays out of the forms' bundles
    delimiter: z.enum(["auto", ",", ";", "\t", "|"]),
    mapping: z.object({
        date: settingsColumn.nullable(),
        dateFormat: z.enum(["auto", ...DATE_FORMATS.map((format) => format.id)]),
        amountLayout: z.enum(["signed", "split"]),
        amount: settingsColumn.nullable(),
        moneyIn: settingsColumn.nullable(),
        moneyOut: settingsColumn.nullable(),
        fee: settingsColumn.nullable(),
        decimal: z.enum(["auto", ".", ","]),
        invert: z.boolean(),
        description: z.array(settingsColumn).max(3),
        groupBy: settingsColumn.nullable(),
        currency: settingsColumn.nullable(),
        filters: z.array(z.object({
            column: settingsColumn,
            values: z.array(z.string().max(200)).max(30),
        })).max(2),
    }),
});

const settingsName = z.string().trim().min(1).max(IMPORT_MAX_SETTINGS_NAME);

export const importSchema = z.object({
    accountId: z.string().min(1),
    rows: z.array(importRowSchema).min(1).max(IMPORT_MAX_ROWS),
    // Settings to remember for the next file with these columns. id: the settings the import started from, if any
    profile: z.object({
        id: z.string().min(1).optional(),
        name: settingsName,
        headerSignature: z.string().min(1).max(5000),
        settings: importSettingsSchema,
    }).optional(),
})

export const importProfileRenameSchema = z.object({ id: z.string().min(1), name: settingsName });
export const importProfileIdSchema = z.object({ id: z.string().min(1) });

// Auth forms. Their messages are keys of Auth.validation, translated where the form shows them.
// The password limits match emailAndPassword in lib/better-auth.js, which checks them again
const authEmail = z.string().trim().pipe(z.email("emailInvalid"));
const newPassword = z.string().min(8, "passwordTooShort").max(128, "passwordTooLong");

export const signInSchema = z.object({
    email: authEmail,
    password: z.string().min(1, "passwordRequired"),
});

export const signUpSchema = z.object({
    name: z.string().trim().min(1, "nameRequired").max(100, "nameTooLong"),
    email: authEmail,
    password: newPassword,
});

export const emailOnlySchema = z.object({ email: authEmail });

// Settings. Same name rule as sign-up
export const nameSchema = signUpSchema.pick({ name: true });

export const newPasswordSchema = z.object({ password: newPassword });
