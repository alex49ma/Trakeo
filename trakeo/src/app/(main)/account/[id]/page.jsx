import React from 'react'
import { getAccountWithTransactions } from '@/actions/accounts';
import { notFound } from 'next/navigation';
import { BarLoader } from 'react-spinners';
import { Suspense } from 'react';
import TransactionTable from '@/app/(main)/account/_components/transaction-table';

export default async function AccountPage({ params }) {
    const { id } = await params;
    const accountData = await getAccountWithTransactions(id);

    if (!accountData) {
        notFound();
    }

    const { transactions, ...account } = accountData;

    return <div className="space-y-8 px-5">
        <div className="flex gap-4 items-end justify-between">
            <div>
                <h1 className="text-5xl sm:text-6xl font-bold gradient-title capitalize">
                    {account.name}</h1><p className="text-muted-foreground">
                    {account.type.charAt(0).toUpperCase() + account.type.slice(1).toLowerCase()} Account
                </p>
            </div>
            <div className="text-right pb-2">
                <div className="text-x1 sm:text-2x1 font-bold">
                    {parseFloat(account.balance).toFixed(2)}€
                </div>
                <p className="text-sm text-muted-foreground">{account._count.transactions} Transactions</p>
            </div>
        </div>

        {/* Chart Section */}

        {/* Transactions Table */}
        <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#78290f" />}>
            <TransactionTable transactions={transactions} />
        </Suspense>


    </div>;

}