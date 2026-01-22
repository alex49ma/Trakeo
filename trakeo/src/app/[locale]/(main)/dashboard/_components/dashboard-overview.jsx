"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const DashboardOverview = ({ accounts, transactions }) => {

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
                <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Card Content</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Card Content</p>
                </CardContent>
            </Card>
        </div>
    )
}

export default DashboardOverview
