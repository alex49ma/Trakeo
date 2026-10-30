import React from 'react'
import { getAccountWithTransactions } from '@/actions/accounts';
import { notFound } from 'next/navigation';
import { BarLoader } from 'react-spinners';
import { Suspense } from 'react';
import TransactionTable from '../_components/transaction-table';
import AccountChart from '../_components/account-chart';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/currency';

import { getLocale, getTranslations } from 'next-intl/server';

export default async function AccountPage({ params }) {
    const { id } = await params;
    const accountData = await getAccountWithTransactions(id);

    if (!accountData) {
        notFound();
    }

    const { transactions, ...account } = accountData;
    const locale = await getLocale();
    const t = await getTranslations('Dashboard');
    const tAccount = await getTranslations('Account');
    const tCommon = await getTranslations('Common');

    return <div className="space-y-8 px-5">
        <div className="flex flex-wrap gap-4 items-end justify-between">
            <div>
                <h1 className="text-5xl sm:text-6xl font-bold gradient-title capitalize">
                    {account.name}</h1>
                <div className="flex items-center gap-2">
                    <p className="text-white">
                        {tCommon('accountType.' + account.type.toUpperCase())}
                    </p>
                    <Badge variant="outline" className="text-white border-white/60">{account.currency}</Badge>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-end gap-4">
                <Link href={`/transaction/transfer?from=${account.id}`}>
                    <Button variant="prominent">
                        <ArrowLeftRight className="h-4 w-4" />
                        {tAccount('internalTransfer')}
                    </Button>
                </Link>
                <Card className="text-right pb-2">
                    <CardHeader>
                        <CardTitle className="text-x1 sm:text-2x1 font-bold">
                            {formatMoney(account.balance, account.currency, locale)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{tAccount('transactionsCount', { count: account._count.transactions })}</p>
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* Chart Section */}
        <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#FFCC80" />}>
            <AccountChart transactions={transactions} currency={account.currency} />
        </Suspense>

        {/* Transactions Table */}
        <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#FFCC80" />}>
            <TransactionTable transactions={transactions} currency={account.currency} />
        </Suspense>


    </div>;

}