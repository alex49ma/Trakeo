"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslations } from 'next-intl'
import TransactionsPieChart from './transactions-pie-chart'
import SimplePieChart from './simple-pie-chart'

const AnalyticsDashboard = ({ transactions = [] }) => {
    const t = useTranslations('Analytics');

    // Get unique years from transactions, default to current year if empty
    const getYears = () => {
        const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
        if (years.size === 0) years.add(new Date().getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    };

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth()).toString()); // 0-11

    // Filter transactions based on selection
    const filteredTransactions = transactions.filter(transaction => {
        const date = new Date(transaction.date);
        const yearMatch = date.getFullYear().toString() === selectedYear;

        // If "all" is selected for month, only check yearMatch
        if (selectedMonth === "all") {
            return yearMatch;
        }

        const monthMatch = date.getMonth().toString() === selectedMonth;
        return yearMatch && monthMatch;
    });

    // Generate month names
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="w-full sm:w-[200px]">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('selectYear')} />
                        </SelectTrigger>
                        <SelectContent>
                            {getYears().map(year => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full sm:w-[200px]">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('selectMonth')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allMonths')}</SelectItem>
                            {months.map((month, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                    {month}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('expensesBreakdown')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionsPieChart data={filteredTransactions} type="EXPENSE" />
                    </CardContent>
                </Card>

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
