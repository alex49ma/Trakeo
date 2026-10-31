import React from 'react'
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight, Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CreateAccountDrawer from '@/components/create-account-drawer';
import TotalBalance from '@/components/total-balance';
import { formatMoney } from '@/lib/currency';
import DefaultPill from '@/app/[locale]/(main)/accounts/_components/default-pill';

const VISIBLE_ACCOUNTS = 4;

// The first few accounts (default first, as getUserAccounts sorts them) with a link to the full /accounts page
const AccountsSummary = async ({ accounts, totalBalance }) => {
    const t = await getTranslations('Accounts');
    const dashboard = await getTranslations('Dashboard');
    const common = await getTranslations('Common');
    const locale = await getLocale();

    const visible = accounts.slice(0, VISIBLE_ACCOUNTS);
    const hidden = accounts.length - visible.length;

    return (
        <Card className="gap-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('title')}</CardTitle>
                {accounts.length > 0 && (
                    <Link
                        href="/accounts"
                        className="min-h-11 -my-3 inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-800"
                    >
                        {t('viewAll')}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                )}
            </CardHeader>
            <CardContent>
                {accounts.length === 0 ? (
                    <div className="flex flex-col items-start gap-3 pt-2">
                        <p className="text-sm text-muted-foreground">{t('noAccounts')}</p>
                        <CreateAccountDrawer>
                            <Button className="bg-orange-700 hover:bg-orange-800 text-white">
                                <Plus />
                                {dashboard('createAccount')}
                            </Button>
                        </CreateAccountDrawer>
                    </div>
                ) : (
                    <>
                        {visible.map((account) => (
                            <Link
                                key={account.id}
                                href={`/account/${account.id}`}
                                className="flex items-center justify-between gap-3 py-3 border-t border-gray-100 -mx-6 px-6 hover:bg-orange-50 transition-colors"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium capitalize truncate">{account.name}</p>
                                        {account.isDefault && <DefaultPill label={t('default')} />}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {common('accountType.' + account.type)} · {account.currency}
                                    </p>
                                </div>
                                <p className="font-bold whitespace-nowrap">
                                    {formatMoney(account.balance, account.currency, locale)}
                                </p>
                            </Link>
                        ))}
                        {hidden > 0 && (
                            <p className="pt-3 border-t border-gray-100 text-xs text-muted-foreground">
                                {t('moreAccounts', { count: hidden })}
                            </p>
                        )}
                        {/* Total across accounts (two accounts or more) */}
                        {totalBalance && (
                            <div className="mt-3 pt-3 border-t">
                                <TotalBalance total={totalBalance} />
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

export default AccountsSummary
