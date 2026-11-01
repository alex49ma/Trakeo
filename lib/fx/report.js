import Big from "big.js";
import { DEFAULT_CURRENCY, currencyDecimals } from "@/lib/currency";
import { convertAmount, crossRate, rateDateOf, todayIso } from "@/lib/fx/convert";
import { getRateTable } from "@/lib/fx/rates";

// Converted totals are shown in the default account's currency (there's no setting for it)
export const resolveReportingCurrency = (accounts) =>
    accounts.find((account) => account.isDefault)?.currency ?? DEFAULT_CURRENCY;

/**
 * Adds to each transaction its amount in the reporting currency (reportingAmount, a number rounded to that currency's
 * decimals), converted at the rate of the transaction's own day. With no rate for that day, reportingAmount is null
 * and rateMissing is true. Transactions already in the reporting currency are copied as they are. Loads one rate
 * table for the whole date range, and none when nothing needs converting.
 */
export async function withReportingAmounts(transactions, accountCurrencyById, reportingCurrency) {
    const foreign = transactions.filter((transaction) => accountCurrencyById[transaction.accountId] !== reportingCurrency);

    let table = {};
    if (foreign.length > 0) {
        const days = foreign.map((transaction) => rateDateOf(transaction.date)).sort();
        const currencies = [reportingCurrency, ...foreign.map((transaction) => accountCurrencyById[transaction.accountId])];
        table = await getRateTable(currencies, days[0], days.at(-1));
    }

    const decimals = currencyDecimals(reportingCurrency);
    return transactions.map((transaction) => {
        const currency = accountCurrencyById[transaction.accountId];
        if (currency === reportingCurrency) {
            return { ...transaction, reportingAmount: Number(transaction.amount.toString()), rateMissing: false };
        }

        const converted = convertAmount(table, transaction.amount, currency, reportingCurrency, rateDateOf(transaction.date));
        return converted
            ? { ...transaction, reportingAmount: converted.round(decimals, Big.roundHalfUp).toNumber(), rateMissing: false }
            : { ...transaction, reportingAmount: null, rateMissing: true };
    });
}

/**
 * Adds up account balances in the reporting currency. Balances are what the user holds now, so they convert at the
 * newest rates. Returns { total, currency, converted, rateDate, missingCurrencies }: total is rounded once, at the end;
 * converted tells whether any balance needed a rate, and rateDate is the oldest rate date used. A currency with no
 * rate yet is left out of the total and listed in missingCurrencies.
 */
export async function convertBalances(accounts, reportingCurrency) {
    const today = todayIso();
    const table = await getRateTable([reportingCurrency, ...accounts.map((account) => account.currency)], today);

    let total = new Big(0);
    const rateDates = [];
    const missingCurrencies = new Set();

    for (const account of accounts) {
        if (account.currency === reportingCurrency) {
            total = total.plus(account.balance.toString());
            continue;
        }

        const cross = crossRate(table, account.currency, reportingCurrency, today);
        if (!cross) {
            missingCurrencies.add(account.currency);
            continue;
        }
        total = total.plus(new Big(account.balance.toString()).times(cross.rate));
        rateDates.push(cross.date);
    }

    return {
        total: total.round(currencyDecimals(reportingCurrency), Big.roundHalfUp).toNumber(),
        currency: reportingCurrency,
        converted: rateDates.length > 0,
        rateDate: rateDates.sort()[0] ?? null,
        missingCurrencies: [...missingCurrencies],
    };
}
