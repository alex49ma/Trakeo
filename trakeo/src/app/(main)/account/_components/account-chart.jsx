"use client"

import React, { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns';
import { startOfDay, subDays, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const currentYear = new Date().getFullYear();

const YEAR = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040]

const DATE_RANGES = {
    "7D": { label: "Last 7 Days", days: 7, relative: true },
    "1M": { label: "Last Month", days: 30, relative: true },
    "3M": { label: "Last 3 Months", days: 90, relative: true },
    "6M": { label: "Last 6 Months", days: 180, relative: true },
    "JAN": { label: "January", days: 31, relative: false, month: 1 },
    "FEB": { label: "February", days: 28, relative: false, month: 2 },
    "MAR": { label: "March", days: 31, relative: false, month: 3 },
    "APR": { label: "April", days: 30, relative: false, month: 4 },
    "MAY": { label: "May", days: 31, relative: false, month: 5 },
    "JUN": { label: "June", days: 30, relative: false, month: 6 },
    "JUL": { label: "July", days: 31, relative: false, month: 7 },
    "AUG": { label: "August", days: 31, relative: false, month: 8 },
    "SEP": { label: "September", days: 30, relative: false, month: 9 },
    "OCT": { label: "October", days: 31, relative: false, month: 10 },
    "NOV": { label: "November", days: 30, relative: false, month: 11 },
    "DEC": { label: "December", days: 31, relative: false, month: 12 },
    ALL: { label: "All Time", days: null, relative: true },
};

const AccountChart = ({ transactions }) => {

    const [dateRange, setDateRange] = useState("1M");
    const [yearRange, setYearRange] = useState(currentYear);

    const filteredTransactions = useMemo(() => {
        const range = DATE_RANGES[dateRange];
        let startDate, endDate;

        if (range.relative) {
            endDate = new Date();
            startDate = range.days
                ? startOfDay(subDays(endDate, range.days))
                : startOfDay(new Date(0));
        } else {
            // range.month is 1-indexed (1-12) in DATE_RANGES
            const monthDate = new Date(yearRange, range.month - 1, 1);
            startDate = startOfMonth(monthDate);
            endDate = endOfMonth(monthDate);
        }

        const filtered = transactions.filter((t) => {
            const transactionDate = new Date(t.date);
            return transactionDate >= startDate && transactionDate <= endOfDay(endDate);
        });

        const grouped = filtered.reduce((acc, transaction) => {
            const date = format(new Date(transaction.date), "MMM dd");
            if (!acc[date]) {
                acc[date] = {
                    date,
                    income: 0,
                    expense: 0,
                    timestamp: new Date(transaction.date).getTime(),
                };
            }
            if (transaction.type === "INCOME") {
                acc[date].income += transaction.amount;
            } else if (transaction.type === "EXPENSE") {
                acc[date].expense += transaction.amount;
            }
            return acc;
        }, {});

        return Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp);

    }, [transactions, dateRange, yearRange]);

    const totals = useMemo(() => {
        return filteredTransactions.reduce((acc, day) => ({
            income: acc.income + day.income,
            expense: acc.expense + day.expense,
        }), { income: 0, expense: 0 })
    }, [filteredTransactions]);

    return (

        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <CardTitle className="text-base font-normal">Transactions Overview</CardTitle>
                <div className="flex gap-2">
                    {DATE_RANGES[dateRange].relative === false && (
                        <Select value={yearRange.toString()} onValueChange={(value) => setYearRange(parseInt(value))}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEAR.map((year) => (
                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Select defaultValue={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(DATE_RANGES).map(([key, { label }]) => {
                                return <SelectItem key={key} value={key}>{label}</SelectItem>
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-around mb-6 text-sm">
                    <div className="text-center">
                        <p className="text-muted-foreground">Total Income</p>
                        <p className="text-lg font-bold text-green-500">{totals.income.toFixed(2)} €</p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground">Total Expense</p>
                        <p className="text-lg font-bold text-red-500">{totals.expense.toFixed(2)} €</p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground">Total Net</p>
                        <p className={(totals.income - totals.expense) >= 0 ? "text-lg font-bold text-green-500" : "text-lg font-bold text-red-500"}>
                            {(totals.income - totals.expense).toFixed(2)} €
                        </p>
                    </div>
                </div>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={filteredTransactions}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="date"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}€`}
                        />
                        <Tooltip
                            formatter={(value) => [`${value}€`, undefined]}
                            contentStyle={{
                                backgroundColor: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                            }}
                        />
                        <Legend />
                        <Bar
                            dataKey="income"
                            name="Income"
                            fill="#22c55e"
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar
                            dataKey="expense"
                            name="Expense"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </CardContent>


        </Card>
    )
}

export default AccountChart