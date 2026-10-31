import { db } from "@/lib/prisma";
import { RATE_BASE_CURRENCY, RATE_CURRENCIES, addDays, toIsoDate, todayIso } from "@/lib/fx/convert";

// exchange_rates.date is a plain DATE, which Prisma reads and writes as UTC midnight
const toDbDate = (isoDate) => new Date(`${isoDate}T00:00:00Z`);

// Stores the rows that are new. A (currency, date) already stored is skipped, so running twice changes nothing
export async function saveRates(rows, source) {
    const { count } = await db.exchangeRate.createMany({
        data: rows.map((row) => ({ date: toDbDate(row.date), currency: row.currency, rate: row.rate, source })),
        skipDuplicates: true,
    });
    return count;
}

// The app's currencies whose newest rate is missing or more than maxDays old, e.g. "PLN (newest 2026-10-20)"
export async function findStaleCurrencies(maxDays) {
    const newest = await db.exchangeRate.groupBy({ by: ["currency"], _max: { date: true } });
    const newestDate = Object.fromEntries(newest.map((row) => [row.currency, toIsoDate(row._max.date)]));
    const oldestFresh = addDays(todayIso(), -maxDays);

    return RATE_CURRENCIES
        .filter((currency) => !newestDate[currency] || newestDate[currency] < oldestFresh)
        .map((currency) => `${currency} (${newestDate[currency] ? `newest ${newestDate[currency]}` : "none"})`);
}

/**
 * The rows a period needs, per currency and oldest first, in the shape lib/fx/convert.js reads: the last row on or
 * before `from` (a period can start on a weekend) plus every row up to `to`. Dates are "YYYY-MM-DD".
 */
export async function getRateTable(currencies, from, to = from) {
    const wanted = [...new Set(currencies)].filter((currency) => currency !== RATE_BASE_CURRENCY);

    const entries = await Promise.all(wanted.map(async (currency) => {
        const [first, rest] = await Promise.all([
            db.exchangeRate.findFirst({ where: { currency, date: { lte: toDbDate(from) } }, orderBy: { date: "desc" } }),
            to > from
                ? db.exchangeRate.findMany({
                    where: { currency, date: { gt: toDbDate(from), lte: toDbDate(to) } },
                    orderBy: { date: "asc" },
                })
                : [],
        ]);
        const rows = [first, ...rest].filter(Boolean).map((row) => ({ date: toIsoDate(row.date), rate: row.rate.toString() }));
        return [currency, rows];
    }));

    return Object.fromEntries(entries);
}
