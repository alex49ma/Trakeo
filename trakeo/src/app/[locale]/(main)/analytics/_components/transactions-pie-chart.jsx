"use client"

import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57', '#83a6ed', '#8e44ad', '#e74c3c', '#3498db', '#16a085'];

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
        const subcategory = transaction.subcategory?.name || t('other');

        if (!acc[category]) {
            acc[category] = { amount: 0, subcategories: {} };
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

    Object.entries(transactionStats).forEach(([category, stats]) => {
        categoryData.push({ name: category, value: stats.amount });
        Object.entries(stats.subcategories).forEach(([sub, amount]) => {
            subcategoryData.push({ name: sub, value: amount });
        });
    });

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={categoryData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        fill="#8884d8"
                    >
                        {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Pie
                        data={subcategoryData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#82ca9d"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {subcategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => `$${value.toFixed(2)}`}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}

export default TransactionsPieChart
