import React from 'react'
import { getAccountWithTransactions } from '@/actions/accounts';
import { notFound } from 'next/navigation';

export default async function AccountPage({ params }) {
    const { id } = await params;
    const accountData = await getAccountWithTransactions(id);

    if (!accountData) {
        notFound();
    }

    const { transactions, ...account } = accountData;

    return <div>
        <div>
            <h1>{account.name}</h1><p className="text-xs text-muted-foreground">
                {account.type.charAt(0).toUpperCase() + account.type.slice(1).toLowerCase()} Account
            </p>
        </div>
        <div>
            <div className="flex items-center">
                {parseFloat(account.balance).toFixed(2)}€
            </div>
            <p>{account._count.transactions} Transactions</p>
        </div>
    </div>;

}