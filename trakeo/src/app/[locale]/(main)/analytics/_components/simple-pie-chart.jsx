"use client"

import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer, Legend } from 'recharts';
import { useTranslations } from 'next-intl';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57', '#83a6ed', '#8e44ad', '#e74c3c', '#3498db', '#16a085'];

const SimplePieChart = ({ data = [], type = "INCOME" }) => {
    const [mounted, setMounted] = useState(false);
    const t = useTranslations('Dashboard');

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="h-[300px] w-full" />;
    }

    if (data.length === 0) {
        return <p className="text-center text-muted-foreground py-4">
            {type === "EXPENSE" ? t('noExpenses') : t('noIncome')}
        </p>;
    }

    // Filter by type
    const filteredTransactions = data.filter((t) => t.type === type);

    if (filteredTransactions.length === 0) {
        return <p className="text-center text-muted-foreground py-4">
            {type === "EXPENSE" ? t('noExpenses') : t('noIncome')}
        </p>;
    }

    // Group by category only
    const transactionStats = filteredTransactions.reduce((acc, transaction) => {
        const category = transaction.category?.name || t('uncategorized');

        if (!acc[category]) {
            acc[category] = 0;
        }
        acc[category] += transaction.amount;

        return acc;
    }, {});

    const categoryData = Object.entries(transactionStats).map(([category, amount]) => ({
        name: category,
        value: amount
    }));

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={categoryData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                    >
                        {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}

export default SimplePieChart
