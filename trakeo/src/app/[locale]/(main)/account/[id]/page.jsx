import React from 'react'
import { getAccountWithTransactions } from '@/actions/accounts';
import { notFound } from 'next/navigation';
import { BarLoader } from 'react-spinners';
import { Suspense } from 'react';
import TransactionTable from '../_components/transaction-table';
import AccountChart from '../_components/account-chart';

import { getTranslations } from 'next-intl/server';

export default async function AccountPage({ params }) {
    const { id } = await params;
    const accountData = await getAccountWithTransactions(id);

    if (!accountData) {
        notFound();
    }

    const { transactions, ...account } = accountData;
    const t = await getTranslations('Dashboard');
    const tAccount = await getTranslations('Account');
    const tCommon = await getTranslations('Common');

    return <div className="space-y-8 px-5">
        <div className="flex gap-4 items-end justify-between">
            <div>
                <h1 className="text-5xl sm:text-6xl font-bold gradient-title capitalize">
                    {account.name}</h1><p className="text-muted-foreground">
                    {tCommon('accountType.' + account.type.toUpperCase())}
                </p>
            </div>
            <div className="text-right pb-2">
                <div className="text-x1 sm:text-2x1 font-bold">
                    {parseFloat(account.balance).toFixed(2)}€
                </div>
                <p className="text-sm text-muted-foreground">{tAccount('transactionsCount', { count: account._count.transactions })}</p>
            </div>
        </div>

        {/* Chart Section */}
        <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#FFCC80" />}>
            <AccountChart transactions={transactions} />
        </Suspense>

        {/* Transactions Table */}
        <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#FFCC80" />}>
            <TransactionTable transactions={transactions} />
        </Suspense>


    </div>;

}