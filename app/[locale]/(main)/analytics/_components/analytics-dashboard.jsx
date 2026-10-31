"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TransactionsPieChart from '@/app/[locale]/(main)/analytics/_components/transactions-pie-chart';
import SimplePieChart from '@/app/[locale]/(main)/analytics/_components/simple-pie-chart';
import CategoriesCard from './categories-card';
import { useTranslations, useLocale } from 'next-intl';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/currency';
import { countsInTotals } from '@/lib/system-categories';

const ALL_ACCOUNTS = "all";
const CURRENCY_PREFIX = "currency:";

const AnalyticsDashboard = ({ accounts, transactions, categories, reportingCurrency, hasRates }) => {
    const t = useTranslations('Analytics');
    const tDashboard = useTranslations('Dashboard');
    const locale = useLocale();

    const currencies = SUPPORTED_CURRENCIES.filter((currency) => accounts?.some((account) => account.currency === currency));
    const accountCurrency = Object.fromEntries((accounts ?? []).map((account) => [account.id, account.currency]));
    const mixedCurrencies = currencies.length > 1;
    // "All accounts" shows every account in the default account's currency, converted at ECB reference rates. Between
    // currencies that needs rates, so until the first ones arrive only the per-currency groups are offered. With a
    // single currency, its group would show the same as "All accounts"
    const offerAllAccounts = !mixedCurrencies || hasRates;
    const currencyGroups = mixedCurrencies ? currencies : [];

    const [selection, setSelection] = useState(
        offerAllAccounts
            ? ALL_ACCOUNTS
            : CURRENCY_PREFIX + (accounts?.find((a) => a.isDefault)?.currency ?? currencies[0] ?? DEFAULT_CURRENCY)
    );
    const isAllAccounts = selection === ALL_ACCOUNTS;
    const isCurrencyGroup = selection.startsWith(CURRENCY_PREFIX);
    const selectedCurrency = isAllAccounts
        ? reportingCurrency
        : isCurrencyGroup ? selection.slice(CURRENCY_PREFIX.length) : accountCurrency[selection];

    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth()).toString());

    // Get unique years from transactions
    const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))]
        .sort((a, b) => b - a);

    // Check if current year is in the list, if not add it
    if (!years.includes(currentDate.getFullYear())) {
        years.unshift(currentDate.getFullYear());
    }

    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(2000, i, 1);
        return {
            value: i.toString(),
            label: date.toLocaleString(locale, { month: 'long' })
        };
    });

    // Filter transactions
    const filteredTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.date);
        const yearMatch = transactionDate.getFullYear().toString() === selectedYear;
        const monthMatch = selectedMonth === "full_year"
            ? true
            : transactionDate.getMonth().toString() === selectedMonth;
        const accountMatch = isAllAccounts
            || (isCurrencyGroup ? accountCurrency[t.accountId] === selectedCurrency : t.accountId === selection);

        return yearMatch && monthMatch && accountMatch;
    });

    // "All accounts" charts each amount in the default account's currency. A transaction with no exchange rate for
    // its date can't be converted, so it's left out and counted in a notice (only those the charts would show)
    const missingRates = isAllAccounts
        ? filteredTransactions.filter((t) => t.rateMissing && countsInTotals(t)).length
        : 0;
    const chartTransactions = isAllAccounts
        ? filteredTransactions.filter((t) => !t.rateMissing).map((t) => ({ ...t, amount: t.reportingAmount }))
        : filteredTransactions;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                {/* Date Selectors */}
                <div className="flex gap-2">
                    {/* Month Selector */}
                    <Select
                        value={selectedMonth}
                        onValueChange={setSelectedMonth}
                    >
                        <SelectTrigger className="w-[150px] bg-white">
                            <SelectValue placeholder={t('month')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="full_year">{t('fullYear')}</SelectItem>
                            {months.map((month) => (
                                <SelectItem key={month.value} value={month.value}>
                                    {month.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Year Selector */}
                    <Select
                        value={selectedYear}
                        onValueChange={setSelectedYear}
                    >
                        <SelectTrigger className="w-[100px] bg-white">
                            <SelectValue placeholder={t('year')} />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Account Selector */}
                <Select
                    value={selection}
                    onValueChange={setSelection}
                >
                    <SelectTrigger className="w-[200px] bg-white">
                        <SelectValue placeholder={tDashboard('selectAccount')} />
                    </SelectTrigger>
                    <SelectContent>
                        {offerAllAccounts && (
                            <SelectItem value={ALL_ACCOUNTS}>{t('allAccounts')}</SelectItem>
                        )}
                        {currencyGroups.map((currency) => (
                            <SelectItem key={currency} value={CURRENCY_PREFIX + currency}>
                                {t('allCurrencyAccounts', { currency })}
                            </SelectItem>
                        ))}
                        {accounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                                {account.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Expense Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('expenseBreakdown')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionsPieChart data={chartTransactions} type="EXPENSE" currency={selectedCurrency} />
                    </CardContent>
                </Card>

                {/* Income Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('incomeBreakdown')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SimplePieChart data={chartTransactions} type="INCOME" currency={selectedCurrency} />
                    </CardContent>
                </Card>
            </div>

            {/* How "All accounts" converts, and what it had to leave out */}
            {isAllAccounts && (mixedCurrencies || missingRates > 0) && (
                <div className="space-y-1 text-xs">
                    {mixedCurrencies && <p className="text-muted-foreground">{t('convertedNote')}</p>}
                    {missingRates > 0 && <p className="text-amber-600">{t('missingRates', { count: missingRates })}</p>}
                </div>
            )}

            {/* Categories Management */}
            <CategoriesCard categories={categories} />
        </div>
    )
}

export default AnalyticsDashboard
