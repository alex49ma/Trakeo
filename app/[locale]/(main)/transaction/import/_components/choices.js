import Big from "big.js";
import { findPossibleDuplicates } from "@/lib/csv-import/duplicates";
import { detectDecimalSeparator, parseAmount } from "@/lib/csv-import/parse";
import { isTransferCategory } from "@/lib/system-categories";

/*
 * Category choices and row edits of the import wizard.
 * A choice, for a group (step 3) or a single row (step 4): { value: "none" | "skip" | "cat:<categoryId>", subcategoryId? }.
 * "none" means no category: the row goes to the built-in Other Expenses / Other Income. "skip" is for groups only.
 * A row edit (step 4): { date?, description?, type?, amount? }, amount as typed ("1 500,50").
 */

export const NO_CHOICE = { value: "none" };

// The categories a row of this type can go to: never the transfer ones
export const categoriesFor = (categories, type) =>
    categories.filter((category) => category.type === type && !isTransferCategory(category));

export const otherCategoryOf = (categories, type) =>
    categories.find((category) => category.systemKey === (type === "EXPENSE" ? "OTHER_EXPENSES" : "OTHER_INCOME"));

/** An amount typed in the preview, as a positive decimal string, or null. Takes "1500.5", "1 500,50" or "-12,30". */
export function parseEditedAmount(text, decimals) {
    const { decimal } = detectDecimalSeparator([text]);
    const amount = parseAmount(text, decimal ?? ".", decimals);
    if (amount === null) return null;
    const positive = new Big(amount).abs();
    return positive.gt(0) ? positive.toFixed(decimals) : null;
}

/** What a choice means for a row of this type: { kind: "none" | "skip" | "category", categoryId, subcategoryId }. */
function choiceTarget(choice, type, categories) {
    const value = choice?.value ?? "none";
    if (value === "skip") return { kind: "skip" };
    if (value.startsWith("cat:")) {
        const category = categoriesFor(categories, type).find((candidate) => candidate.id === value.slice(4));
        if (category) {
            const subcategoryId = category.subCategories?.some((sub) => sub.id === choice.subcategoryId) ? choice.subcategoryId : null;
            return { kind: "category", categoryId: category.id, subcategoryId };
        }
    }
    // Also a category of the other type, after an edit changed the row's type
    return { kind: "none" };
}

/** A target as a choice, for the row's category picker. */
export const targetChoice = (target) =>
    target.kind === "category" ? { value: `cat:${target.categoryId}`, subcategoryId: target.subcategoryId } : NO_CHOICE;

/**
 * Applies the choices and edits to the rows read from the file.
 * Returns { rows, summary }:
 * - rows: every row, with the edits applied, plus importable, checked, edited, target and duplicateOf. Rows of a
 *   "Don't import" group get status "skipped", and an edit with an unreadable amount status "invalidEdit".
 *   Possible duplicates start unticked.
 * - summary: the counts and totals the preview shows, for the ticked rows. Money as Big.
 */
export function resolveImport({ rows, choices, rowChoices, rowEdits, ticks, existing, categories, decimals }) {
    const targeted = rows.map((row) => {
        if (row.status !== "ready") return { ...row, importable: false };
        if ((choices[row.groupId]?.value ?? "none") === "skip") return { ...row, status: "skipped", importable: false };

        const edit = rowEdits[row.index];
        let edited = row;
        if (edit) {
            edited = {
                ...row,
                edited: true,
                date: edit.date ?? row.date,
                description: edit.description ?? row.description,
                type: edit.type ?? row.type,
            };
            if (edit.amount !== undefined) {
                const amount = parseEditedAmount(edit.amount, decimals);
                if (amount === null) return { ...edited, status: "invalidEdit", importable: false };
                edited.amount = amount;
            }
            edited.signedAmount = edited.type === "EXPENSE" ? new Big(edited.amount).neg().toFixed(decimals) : edited.amount;
        }

        const target = choiceTarget(rowChoices[row.index] ?? choices[row.groupId], edited.type, categories);
        return { ...edited, importable: true, target: target.kind === "skip" ? { kind: "none" } : target };
    });

    const duplicates = existing ? findPossibleDuplicates(targeted.filter((row) => row.importable), existing) : new Map();
    const resolved = targeted.map((row) => {
        if (!row.importable) return { ...row, checked: false, duplicateOf: null };
        const duplicateOf = duplicates.get(row.index) ?? null;
        return { ...row, duplicateOf, checked: ticks[row.index] ?? !duplicateOf };
    });

    const checked = resolved.filter((row) => row.checked);
    let income = new Big(0);
    let expenses = new Big(0);
    for (const row of checked) {
        if (row.type === "INCOME") income = income.plus(row.amount);
        else expenses = expenses.plus(row.amount);
    }
    const count = (predicate) => resolved.filter(predicate).length;

    return {
        rows: resolved,
        summary: {
            total: resolved.length,
            filtered: count((row) => row.status === "filtered"),
            otherCurrency: count((row) => row.status === "otherCurrency"),
            unreadable: count((row) => row.status === "unreadable" || row.status === "invalidEdit"),
            zero: count((row) => row.status === "zero"),
            skipped: count((row) => row.status === "skipped"),
            duplicates: count((row) => row.duplicateOf),
            duplicatesLeftOut: count((row) => row.duplicateOf && !row.checked),
            unticked: count((row) => row.importable && !row.duplicateOf && !row.checked),
            edited: checked.filter((row) => row.edited).length,
            toImport: checked.length,
            noCategory: checked.filter((row) => row.target.kind === "none").length,
            income,
            expenses,
            net: income.minus(expenses),
        },
    };
}

/** The request for importTransactions: the ticked rows. A row without a category goes to the built-in Other. */
export function buildPayload(result, accountId, categories) {
    return {
        accountId,
        rows: result.rows.filter((row) => row.checked).map((row) => ({
            date: row.date,
            amount: row.amount,
            type: row.type,
            description: row.description,
            categoryId: row.target.kind === "category" ? row.target.categoryId : otherCategoryOf(categories, row.type)?.id,
            subcategoryId: row.target.kind === "category" ? row.target.subcategoryId : null,
        })),
    };
}
