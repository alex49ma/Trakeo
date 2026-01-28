"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TransactionsPieChart from '@/app/[locale]/(main)/analytics/_components/transactions-pie-chart';
import SimplePieChart from '@/app/[locale]/(main)/analytics/_components/simple-pie-chart';
import { useTranslations, useLocale } from 'next-intl';

const AnalyticsDashboard = ({ accounts, transactions }) => {
    const t = useTranslations('Analytics');
    const tDashboard = useTranslations('Dashboard');
    const locale = useLocale();

    const [selectedAccountId, setSelectedAccountId] = useState(
        accounts?.find((a) => a.isDefault)?.id || accounts?.[0]?.id
    );

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
        const accountMatch = t.accountId === selectedAccountId;

        return yearMatch && monthMatch && accountMatch;
    });

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
                        <SelectTrigger className="w-[150px]">
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
                        <SelectTrigger className="w-[100px]">
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
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={tDashboard('selectAccount')} />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                                {account.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Expense Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('expenseBreakdown')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionsPieChart data={filteredTransactions} type="EXPENSE" />
                    </CardContent>
                </Card>

                {/* Income Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('incomeBreakdown')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SimplePieChart data={filteredTransactions} type="INCOME" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default AnalyticsDashboard
