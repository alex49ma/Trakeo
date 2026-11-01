import React from 'react'
import { getTranslations } from 'next-intl/server';
import { ArrowLeftRight, Plus } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { getAccountsOverview } from '@/actions/accounts'
import { getTotalBalance } from '@/actions/dashboard'
import CreateAccountDrawer from '@/components/create-account-drawer'
import TotalBalance from '@/components/total-balance'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import AccountCard from './_components/account-card'

const CreateAccountButton = ({ label }) => (
    <CreateAccountDrawer>
        <Button size="lg" className="h-11 bg-orange-700 hover:bg-orange-800 text-white">
            <Plus />
            {label}
        </Button>
    </CreateAccountDrawer>
);

async function AccountsPage() {
    const t = await getTranslations('Accounts');
    const dashboard = await getTranslations('Dashboard');

    const [accounts, totalBalance] = await Promise.all([getAccountsOverview(), getTotalBalance()]);

    const sections = [
        { title: t('currentAccounts'), accounts: accounts.filter((account) => account.type === "CURRENT") },
        { title: t('savingsAccounts'), accounts: accounts.filter((account) => account.type === "SAVINGS") },
    ].filter((section) => section.accounts.length > 0);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-4">
                    <h1 className="text-6xl font-bold gradient-title">{t('title')}</h1>
                    {/* Total across accounts (two accounts or more) */}
                    {totalBalance && <TotalBalance total={totalBalance} variant="banner" />}
                </div>
                {accounts.length > 0 && (
                    <div className="flex flex-wrap gap-3 md:pt-2">
                        {accounts.length > 1 && (
                            <Button asChild variant="outline" size="lg" className="h-11">
                                <Link href="/transaction/transfer">
                                    <ArrowLeftRight />
                                    {dashboard('internalTransfer')}
                                </Link>
                            </Button>
                        )}
                        <CreateAccountButton label={dashboard('createAccount')} />
                    </div>
                )}
            </div>

            {accounts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
                        <p className="text-muted-foreground">{t('noAccounts')}</p>
                        <CreateAccountButton label={dashboard('createAccount')} />
                    </CardContent>
                </Card>
            ) : (
                sections.map((section) => (
                    <section key={section.title} className="space-y-3">
                        <h2 className="text-lg font-semibold text-orange-50">{section.title}</h2>
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {section.accounts.map((account) => (
                                <AccountCard key={account.id} account={account} />
                            ))}
                        </div>
                    </section>
                ))
            )}
        </div>
    )
}

export default AccountsPage
