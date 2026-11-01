import Big from "big.js";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

// Stored rates are units of a currency per 1 EUR, as the ECB publishes them, so EUR itself is never stored
export const RATE_BASE_CURRENCY = "EUR";
export const RATE_CURRENCIES = SUPPORTED_CURRENCIES.filter((currency) => currency !== RATE_BASE_CURRENCY);

const CROSS_RATE_DECIMALS = 10;
// A rate counts as stale when it's this many days older than the date it's used for
const STALE_AFTER_DAYS = 7;

// Rate dates are plain "YYYY-MM-DD" strings, so they compare as text
export const toIsoDate = (date) => date.toISOString().slice(0, 10);
export const todayIso = () => toIsoDate(new Date());

export const addDays = (isoDate, days) => {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return toIsoDate(date);
};

const daysBetween = (fromIsoDate, toIsoDate) =>
    (Date.parse(`${toIsoDate}T00:00:00Z`) - Date.parse(`${fromIsoDate}T00:00:00Z`)) / 86_400_000;

// The day whose rate converts a stored transaction. The forms save local midnight, which east of Greenwich is the
// evening before in UTC, so half a day later lands on the intended day anywhere from UTC−11 to UTC+12
export const rateDateOf = (date) => toIsoDate(new Date(new Date(date).getTime() + 12 * 3_600_000));

/**
 * The rate of one currency on a date: the latest row on or before it, so weekends and holidays use the previous
 * working day. table maps each currency to its rows, oldest first: { CZK: [{ date: "2026-10-30", rate: "24.353" }] }.
 * Returns { rate: Big, date, stale }, or null when there's no row on or before the date. EUR is always 1.
 */
export function rateOn(table, currency, date) {
    if (currency === RATE_BASE_CURRENCY) return { rate: new Big(1), date: null, stale: false };

    const row = (table[currency] ?? []).findLast((candidate) => candidate.date <= date);
    if (!row) return null;

    return { rate: new Big(row.rate), date: row.date, stale: daysBetween(row.date, date) > STALE_AFTER_DAYS };
}

/**
 * How many units of `to` one unit of `from` buys on a date, kept at 10 decimals: rate(to) / rate(from).
 * date is the older of the two rate dates. Same currency is rate 1 without a lookup; null when a rate is missing.
 */
export function crossRate(table, from, to, date) {
    if (from === to) return { rate: new Big(1), date: null, stale: false };

    const fromRate = rateOn(table, from, date);
    const toRate = rateOn(table, to, date);
    if (!fromRate || !toRate) return null;

    const [oldestDate = null] = [fromRate.date, toRate.date].filter(Boolean).sort();
    return {
        rate: toRate.rate.div(fromRate.rate).round(CROSS_RATE_DECIMALS, Big.roundHalfUp),
        date: oldestDate,
        stale: fromRate.stale || toRate.stale,
    };
}

// An amount (number, string or Decimal) in `from` expressed in `to`, as an unrounded Big: round once, at the end.
// null when a rate is missing
export function convertAmount(table, amount, from, to, date) {
    const cross = crossRate(table, from, to, date);
    return cross ? new Big(amount.toString()).times(cross.rate) : null;
}
