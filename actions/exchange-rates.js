"use server"

import z from "zod";
import { auth } from "@clerk/nextjs/server";
import { isSupportedCurrency } from "@/lib/currency";
import { crossRate } from "@/lib/fx/convert";
import { getRateTable } from "@/lib/fx/rates";

const isoDate = z.iso.date();

/**
 * The ECB reference rate between two currencies on a "YYYY-MM-DD" day, or on the last working day before it.
 * Returns { rate, rateDate }, with the rate as a 10-decimal string, or null when there's none. Rates are public data,
 * so any supported pair works, whether or not the user holds it.
 */
export async function getReferenceRate(fromCurrency, toCurrency, date) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    if (!isSupportedCurrency(fromCurrency) || !isSupportedCurrency(toCurrency) || fromCurrency === toCurrency) return null;
    if (!isoDate.safeParse(date).success) return null;

    const table = await getRateTable([fromCurrency, toCurrency], date);
    const result = crossRate(table, fromCurrency, toCurrency, date);

    return result ? { rate: result.rate.toFixed(10), rateDate: result.date } : null;
}
