import Big from "big.js";
import { endOfDay } from "date-fns";
import { IMPORT_MAX_DESCRIPTION } from "./limits";
import { groupKey, normalizeName } from "./keys";
import { detectDateFormats, detectDecimalSeparator, parseAmount, parseDate } from "./parse";

const columnValues = (dataRows, index) => dataRows.map((row) => row[index] ?? "");

// The columns that hold money: they share the decimal separator
const amountColumns = (mapping) =>
    [...(mapping.amountLayout === "split" ? [mapping.moneyIn, mapping.moneyOut] : [mapping.amount]), mapping.fee ?? null]
        .filter((index) => index !== null);

/**
 * The date format and decimal separator the rows are read with: the mapping's choice, or what the column's values
 * show when it's "auto". The "ambiguous" flags tell step 2 to point the choice out.
 * With no separator in any amount, any choice gives the same numbers, so "." is used. When the values can't tell
 * ("1,500" everywhere), the language decides: "." in English, "," in Spanish and Czech.
 */
export function resolveFormats(dataRows, mapping, locale) {
    const dates = mapping.date === null ? { formats: [], best: null } : detectDateFormats(columnValues(dataRows, mapping.date));
    const separator = detectDecimalSeparator(amountColumns(mapping).flatMap((index) => columnValues(dataRows, index)));
    const fallbackDecimal = separator.sure ? "." : locale === "en" ? "." : ",";

    return {
        dateFormat: mapping.dateFormat === "auto" ? dates.best : mapping.dateFormat,
        detectedDateFormat: dates.best,
        dateAmbiguous: mapping.dateFormat === "auto" && dates.formats.length > 1,
        decimal: mapping.decimal === "auto" ? (separator.decimal ?? fallbackDecimal) : mapping.decimal,
        detectedDecimal: separator.decimal ?? fallbackDecimal,
        decimalAmbiguous: mapping.decimal === "auto" && !separator.sure,
    };
}

// The signed amount of a row as a decimal string, or null when it can't be read
function readAmount(cell, mapping, decimal, decimals) {
    let value;
    if (mapping.amountLayout === "split") {
        const moneyInText = cell(mapping.moneyIn);
        const moneyOutText = cell(mapping.moneyOut);
        if (!moneyInText && !moneyOutText) return null;

        const moneyIn = moneyInText ? parseAmount(moneyInText, decimal, decimals) : "0";
        const moneyOut = moneyOutText ? parseAmount(moneyOutText, decimal, decimals) : "0";
        if (moneyIn === null || moneyOut === null) return null;
        // Banks write the money-out column with or without a minus
        value = new Big(moneyIn).abs().minus(new Big(moneyOut).abs());
    } else {
        const amount = parseAmount(cell(mapping.amount), decimal, decimals);
        if (amount === null) return null;
        value = new Big(amount);
    }
    if (mapping.invert) value = value.neg();

    // A fee is charged on top of the amount, so it always takes money away. An unreadable fee makes the row unreadable
    const feeText = cell(mapping.fee);
    if (feeText) {
        const fee = parseAmount(feeText, decimal, decimals);
        if (fee === null) return null;
        value = value.minus(new Big(fee).abs());
    }
    return value.toFixed(decimals);
}

/**
 * One object per data row of the file, read with the mapping:
 * { index, rowNumber, status, reason, raw, date, type, amount, signedAmount, description, groupId, groupText }.
 * rowNumber counts the file's rows from 1, header and preamble included (empty lines aren't counted).
 * status is checked in this order:
 *   "filtered"      a filter's column has another value (reason: the column index)
 *   "otherCurrency" the currency column has another currency than the account (reason: that currency)
 *   "unreadable"    reason "date", "futureDate" or "amount", with the cell's text in raw
 *   "zero"          the amount is 0
 *   "ready"         amount is positive, type follows its sign, and groupId groups the row for categories
 */
export function buildRows(table, mapping, formats, currency, decimals) {
    const latest = endOfDay(new Date());
    const filters = mapping.filters
        .filter((filter) => filter.column !== null)
        .map((filter) => ({ column: filter.column, values: new Set(filter.values) }));
    // Descriptions carry numbers (card endings, references) that would make every row its own group
    const groupByDescription = mapping.groupBy !== null && mapping.description.includes(mapping.groupBy);

    return table.dataRows.map((cells, index) => {
        const cell = (column) => (column === null || column === undefined ? "" : String(cells[column] ?? "").trim());
        const description = mapping.description.map(cell).filter(Boolean).join(" · ").slice(0, IMPORT_MAX_DESCRIPTION);
        // cells: the file's row as it is, so the wizard can show all of it
        const row = { index, rowNumber: table.headerIndex + index + 2, cells, description, status: "ready", reason: null, raw: null };

        const failedFilter = filters.find((filter) => !filter.values.has(cell(filter.column)));
        if (failedFilter) return { ...row, status: "filtered", reason: failedFilter.column };

        if (mapping.currency !== null) {
            const rowCurrency = cell(mapping.currency).toUpperCase();
            if (rowCurrency && rowCurrency !== currency) return { ...row, status: "otherCurrency", reason: rowCurrency };
        }

        const dateText = cell(mapping.date);
        const date = formats.dateFormat ? parseDate(dateText, formats.dateFormat) : null;
        if (!date) return { ...row, status: "unreadable", reason: "date", raw: dateText };
        if (date > latest) return { ...row, status: "unreadable", reason: "futureDate", raw: dateText, date };

        const signedAmount = readAmount(cell, mapping, formats.decimal, decimals);
        if (signedAmount === null) {
            const raw = amountColumns(mapping).map(cell).filter(Boolean).join(" / ");
            return { ...row, status: "unreadable", reason: "amount", raw, date };
        }

        const amount = new Big(signedAmount);
        if (amount.eq(0)) return { ...row, status: "zero", date, signedAmount };

        const type = amount.lt(0) ? "EXPENSE" : "INCOME";
        const groupText = cell(mapping.groupBy);
        const key = mapping.groupBy === null ? "" : groupByDescription ? groupKey(groupText) : normalizeName(groupText);
        // A row with nothing in the Group by column has nothing in common with the others: it's a group of its own
        const alone = mapping.groupBy !== null && !key;

        return {
            ...row,
            date,
            type,
            amount: amount.abs().toFixed(decimals),
            signedAmount,
            groupId: alone ? `${type}|#${index}` : `${type}|${key}`,
            groupText: alone ? description : groupText,
            alone,
        };
    });
}

/**
 * The category groups of the ready rows: { id, type, label, variants, count, total, rows }, biggest total first.
 * label is the group's most common original text, variants how many different texts it merges, total the sum of its
 * amounts (a positive decimal string) and rows the indexes of its rows.
 */
export function buildGroups(rows, decimals) {
    const groups = new Map();
    for (const row of rows) {
        if (row.status !== "ready") continue;

        let group = groups.get(row.groupId);
        if (!group) {
            group = { id: row.groupId, type: row.type, alone: row.alone, texts: new Map(), count: 0, total: new Big(0), rows: [] };
            groups.set(row.groupId, group);
        }
        group.count++;
        group.total = group.total.plus(row.amount);
        group.texts.set(row.groupText, (group.texts.get(row.groupText) ?? 0) + 1);
        group.rows.push(row.index);
    }

    return [...groups.values()]
        .map((group) => ({
            id: group.id,
            type: group.type,
            // A single row whose Group by cell is empty (labelled by its description)
            alone: group.alone,
            label: [...group.texts.entries()].sort((a, b) => b[1] - a[1])[0][0],
            variants: group.texts.size,
            count: group.count,
            total: group.total.toFixed(decimals),
            rows: group.rows,
        }))
        .sort((a, b) => new Big(b.total).cmp(a.total));
}
