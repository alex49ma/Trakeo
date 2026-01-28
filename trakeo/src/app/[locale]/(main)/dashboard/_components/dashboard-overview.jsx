"use client"

import React, { useState } from 'react'
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import TransactionsPieChart from '@/app/[locale]/(main)/analytics/_components/transactions-pie-chart';

import { useTranslations } from 'next-intl';

const DashboardOverview = ({ accounts, transactions }) => {
    const t = useTranslations('Dashboard');

    const [selectedAccountId, setSelectedAccountId] = useState(
        accounts?.find((a) => a.isDefault)?.id || accounts?.[0]?.id
    );

    // Filter transactions
    const accountTransactions = transactions.filter(
        (t) => t.accountId === selectedAccountId
    );

    const recentTransactions = accountTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-normal">
                        {t('recentTransactions')}
                    </CardTitle>
                    <Select
                        value={selectedAccountId}
                        onValueChange={setSelectedAccountId}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t('selectAccount')} />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentTransactions.length === 0 ? (
                            <p>{t('noRecentTransactions')}</p>
                        ) : (
                            recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {transaction.description || t('untitledTransaction')}
                                        </p>
                                        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                                            {format(new Date(transaction.date), "PP")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={cn(
                                                "flex items-center",
                                                transaction.type === "EXPENSE" ? "text-red-500" : "text-green-500"
                                            )}
                                        >
                                            {transaction.type === "EXPENSE" ? (
                                                <ArrowDownRight className="mr-1 h-4 w-4" />
                                            ) : (
                                                <ArrowUpRight className="mr-1 h-4 w-4" />
                                            )}
                                            ${transaction.amount.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('expensesBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <TransactionsPieChart data={accountTransactions} type="EXPENSE" />
                </CardContent>
            </Card>
        </div>
    )
}

export default DashboardOverview
