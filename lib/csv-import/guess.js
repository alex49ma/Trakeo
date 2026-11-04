import { normalizeName } from "./keys";
import { amountRatio, detectDateFormats, detectDecimalSeparator } from "./parse";

// Words that suggest what a column holds, compared with normalizeName (lowercase, no accents)
const WORDS = {
    date: ["date", "datum", "fecha", "data", "booking", "zauctovani", "valuta"],
    // Among several date columns, these win (the booking date) and these lose (the date a payment was started)
    preferredDate: ["complet", "book", "zauct", "contable", "posted", "operac"],
    secondaryDate: ["start", "valor", "value", "splatnost"],
    amount: ["amount", "castka", "importe", "cantidad", "betrag", "kwota", "monto"],
    moneyIn: ["credit", "abono", "ingreso", "prijem", "haben", "paid in", "money in"],
    moneyOut: ["debit", "cargo", "gasto", "vydaj", "soll", "paid out", "money out"],
    notAmount: ["balance", "saldo", "zustatek", "kontostand", "fee", "poplatek", "comision", "gebuhr"],
    fee: ["fee", "poplatek", "comision", "gebuhr", "oplata"],
    description: ["description", "note", "poznamka", "popis", "zprava", "message", "concepto", "descripcion", "merchant", "obchodnik", "counterparty", "protiucet", "payee", "detalle"],
    category: ["category", "kategorie", "categoria"],
    currency: ["currency", "mena", "moneda", "divisa", "wahrung", "waluta"],
    status: ["state", "status", "stav", "estado"],
};

// Status values that mean the money didn't (or didn't yet) move. They start unticked in the suggested filter
const NOT_BOOKED = /pend|revert|declin|fail|cancel|reject|rechaz|zamit|storn|expir/i;
const MAX_FILTER_VALUES = 10;
// A column's values must mostly look right before a header word is trusted
const VALUE_CHECK = 0.9;

const headerHas = (column, words) => {
    const header = normalizeName(column);
    return words.some((word) => header.includes(word));
};

const columnValues = (dataRows, index) => dataRows.map((row) => row[index] ?? "");

const looksLikeAmounts = (dataRows, index) => {
    const values = columnValues(dataRows, index);
    const { decimal } = detectDecimalSeparator(values);
    return amountRatio(values, decimal ?? ".") >= VALUE_CHECK;
};

const looksLikeDates = (dataRows, index) => detectDateFormats(columnValues(dataRows, index)).ratio >= VALUE_CHECK;

const looksLikeCurrencies = (dataRows, index) => {
    const values = columnValues(dataRows, index).map((value) => value.trim()).filter(Boolean);
    return values.length > 0 && values.filter((value) => /^[A-Za-z]{3}$/.test(value)).length / values.length >= VALUE_CHECK;
};

const indexes = (columns) => columns.map((_, index) => index);

function guessDateColumn(columns, dataRows) {
    const candidates = indexes(columns).filter((index) => headerHas(columns[index], WORDS.date) && looksLikeDates(dataRows, index));
    if (candidates.length > 0) {
        const score = (index) => headerHas(columns[index], WORDS.preferredDate) ? 2 : headerHas(columns[index], WORDS.secondaryDate) ? 0 : 1;
        return candidates.reduce((best, index) => (score(index) > score(best) ? index : best));
    }
    return indexes(columns).find((index) => looksLikeDates(dataRows, index)) ?? null;
}

function guessAmount(columns, dataRows, dateColumn) {
    const amountColumns = indexes(columns).filter((index) => !headerHas(columns[index], WORDS.notAmount));
    const signed = amountColumns.find((index) => headerHas(columns[index], WORDS.amount) && looksLikeAmounts(dataRows, index));
    if (signed !== undefined) return { amountLayout: "signed", amount: signed };

    const moneyIn = amountColumns.find((index) => headerHas(columns[index], WORDS.moneyIn));
    const moneyOut = amountColumns.find((index) => headerHas(columns[index], WORDS.moneyOut));
    if (moneyIn !== undefined && moneyOut !== undefined && moneyIn !== moneyOut) {
        return { amountLayout: "split", moneyIn, moneyOut };
    }

    const fallback = amountColumns.find((index) => index !== dateColumn && looksLikeAmounts(dataRows, index));
    return { amountLayout: "signed", amount: fallback ?? null };
}

function guessStatusFilter(columns, dataRows) {
    const column = indexes(columns).find((index) => headerHas(columns[index], WORDS.status));
    if (column === undefined) return [];

    const values = [...new Set(columnValues(dataRows, column).map((value) => value.trim()))];
    if (values.length > MAX_FILTER_VALUES) return [];
    return [{ column, values: values.filter((value) => !NOT_BOOKED.test(value)) }];
}

/** An empty mapping: no column chosen for anything. */
export const emptyMapping = () => ({
    date: null,
    dateFormat: "auto",
    amountLayout: "signed",
    amount: null,
    moneyIn: null,
    moneyOut: null,
    fee: null,
    decimal: "auto",
    invert: false,
    description: [],
    groupBy: null,
    currency: null,
    filters: [],
});

/**
 * The starting mapping for a file, from its header names and its values. Every column is referred to by its index.
 * These are only guesses: step 2 of the import shows them, and the user corrects them.
 */
export function guessMapping(columns, dataRows) {
    const mapping = emptyMapping();

    mapping.date = guessDateColumn(columns, dataRows);
    Object.assign(mapping, guessAmount(columns, dataRows, mapping.date));

    // Fees are charged on top of the amount (Revolut card payments abroad, ATM withdrawals...)
    mapping.fee = indexes(columns).find((index) => headerHas(columns[index], WORDS.fee) && looksLikeAmounts(dataRows, index)) ?? null;

    const description = indexes(columns).find((index) => headerHas(columns[index], WORDS.description));
    if (description !== undefined) mapping.description = [description];

    const category = indexes(columns).find((index) => headerHas(columns[index], WORDS.category));
    mapping.groupBy = category ?? description ?? null;

    mapping.currency = indexes(columns).find((index) => headerHas(columns[index], WORDS.currency) && looksLikeCurrencies(dataRows, index)) ?? null;
    mapping.filters = guessStatusFilter(columns, dataRows);

    return mapping;
}
