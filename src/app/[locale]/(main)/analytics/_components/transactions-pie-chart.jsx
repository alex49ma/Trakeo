"use client"

import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from 'recharts';


import { useTranslations } from 'next-intl';

const TransactionsPieChart = ({ data = [], type = "EXPENSE" }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const t = useTranslations('Dashboard');

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

    // Group expenses by category and subcategory
    const transactionStats = filteredTransactions.reduce((acc, transaction) => {
        const category = transaction.category?.name || t('uncategorized');
        const color = transaction.category?.color || '#333333'; // Default color
        const subcategory = transaction.subcategory?.name || t('other');

        if (!acc[category]) {
            acc[category] = { amount: 0, color, subcategories: {} };
        }
        acc[category].amount += transaction.amount;

        if (!acc[category].subcategories[subcategory]) {
            acc[category].subcategories[subcategory] = 0;
        }
        acc[category].subcategories[subcategory] += transaction.amount;

        return acc;
    }, {});

    const categoryData = [];
    const subcategoryData = [];

    // Helper to convert hex to rgba
    const hexToRgba = (hex, alpha) => {
        if (!hex) return 'rgba(0,0,0,0.5)';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Store sorted data for legend
    const sortedCategories = Object.entries(transactionStats)
        .sort(([, a], [, b]) => b.amount - a.amount);

    sortedCategories.forEach(([category, stats]) => {
        categoryData.push({
            name: category,
            value: stats.amount,
            fill: stats.color
        });

        const subEntries = Object.entries(stats.subcategories);
        const subCount = subEntries.length;

        // Sort subcategories by amount descending for better visual ordering
        subEntries.sort(([, a], [, b]) => b - a);

        stats.sortedSubcategories = subEntries; // Store for legend

        subEntries.forEach(([sub, amount], index) => {
            // Calculate alpha based on index to differentiate subcategories
            // Start from 0.9 and go down to 0.4
            let alpha = 0.9;
            if (subCount > 1) {
                const step = (0.9 - 0.4) / (subCount - 1);
                alpha = 0.9 - (index * step);
            }

            subcategoryData.push({
                name: sub,
                value: amount,
                fill: hexToRgba(stats.color, alpha.toFixed(2))
            });
        });
    });

    return (
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 h-auto lg:h-[300px]">
            {/* Custom Legend */}
            <div className="w-full lg:flex-1 space-y-4 p-4 max-h-[300px] overflow-y-auto order-2 lg:order-1">
                {sortedCategories.map(([category, stats]) => (
                    <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-semibold">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded-sm"
                                    style={{ backgroundColor: stats.color }}
                                />
                                <span>{category}</span>
                            </div>
                            <span>
                                {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(stats.amount)}
                            </span>
                        </div>

                        <div className="pl-6 space-y-1">
                            {stats.sortedSubcategories.map(([sub, amount], index) => {
                                // Re-calculate alpha for consistency (or store it earlier if optimal, but valid here too)
                                const subCount = stats.sortedSubcategories.length;
                                let alpha = 0.9;
                                if (subCount > 1) {
                                    const step = (0.9 - 0.4) / (subCount - 1);
                                    alpha = 0.9 - (index * step);
                                }
                                const subColor = hexToRgba(stats.color, alpha.toFixed(2));

                                return (
                                    <div key={sub} className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: subColor }}
                                            />
                                            <span>{sub}</span>
                                        </div>
                                        <span>
                                            {new Intl.NumberFormat('en-US', {
                                                style: 'currency',
                                                currency: 'EUR'
                                            }).format(amount)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
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
                            outerRadius="60%"
                            fill="#8884d8"
                        >
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Pie
                            data={subcategoryData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius="70%"
                            outerRadius="90%"
                            fill="#82ca9d"
                        >
                            {subcategoryData.map((entry, index) => (
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

export default TransactionsPieChart
