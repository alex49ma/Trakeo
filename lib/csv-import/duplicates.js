import Big from "big.js";
import { rateDateOf } from "@/lib/fx/convert";

// Same day (with the +12 h rule that turns the forms' local midnight into the intended day), type and amount
const duplicateKey = (date, type, amount) => `${rateDateOf(date)}|${type}|${new Big(amount).toString()}`;

/**
 * Pairs import rows with existing transactions of the account that have the same day, type and amount. The description
 * isn't compared: what someone types by hand rarely matches the bank's text.
 * Each existing transaction pairs with at most one row, in file order, so two equal coffees in the file and one in the
 * account flag only one row. Rows aren't compared with each other.
 * rows: [{ index, date, type, amount }]. existing: [{ id, date, type, amount, ... }].
 * Returns a Map from row index to the existing transaction it matched.
 */
export function findPossibleDuplicates(rows, existing) {
    const pool = new Map();
    for (const transaction of existing) {
        const key = duplicateKey(transaction.date, transaction.type, transaction.amount);
        if (!pool.has(key)) pool.set(key, []);
        pool.get(key).push(transaction);
    }

    const matches = new Map();
    for (const row of rows) {
        const candidates = pool.get(duplicateKey(row.date, row.type, row.amount));
        if (candidates?.length) matches.set(row.index, candidates.shift());
    }
    return matches;
}
