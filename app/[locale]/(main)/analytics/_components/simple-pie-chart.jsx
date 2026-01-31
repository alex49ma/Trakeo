"use client"

import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';


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
        const color = transaction.category?.color || '#333333'; // Default color

        if (!acc[category]) {
            acc[category] = { amount: 0, color };
        }
        acc[category].amount += transaction.amount;

        return acc;
    }, {});

    const categoryData = Object.entries(transactionStats)
        .map(([category, stats]) => ({
            name: category,
            value: stats.amount,
            fill: stats.color
        }))
        .sort((a, b) => b.value - a.value);

    return (
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 h-auto lg:h-[300px]">
            {/* Custom Legend */}
            <div className="w-full lg:flex-1 space-y-4 p-4 max-h-[300px] overflow-y-auto order-2 lg:order-1">
                {categoryData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm font-semibold">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded-sm"
                                style={{ backgroundColor: item.fill }}
                            />
                            <span>{item.name}</span>
                        </div>
                        <span>
                            {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'EUR'
                            }).format(item.value)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="w-full lg:flex-1 h-[300px] order-1 lg:order-2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={categoryData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            fill="#8884d8"
                        >
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value) => new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'EUR'
                            }).format(value)}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default SimplePieChart
