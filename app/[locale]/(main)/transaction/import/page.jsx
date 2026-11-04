import React from 'react'
import { getTranslations } from 'next-intl/server';
import { getUserAccounts } from '@/actions/dashboard';
import { getCategories } from '@/actions/categories';
import { getImportProfiles } from '@/actions/import';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ImportWizard from './_components/import-wizard';

const ImportPage = async (props) => {
    const searchParams = await props.searchParams;
    const accounts = await getUserAccounts();
    const categories = await getCategories();
    const profiles = await getImportProfiles();
    const t = await getTranslations('CsvImport');

    // The account the page was opened from (?account=), or the default account. Saved settings may replace the
    // default one with the account they were last used with, but never an account the URL chose
    const accountFromUrl = accounts.find((account) => account.id === searchParams?.account)?.id;
    const initialAccountId = accountFromUrl
        ?? accounts.find((account) => account.isDefault)?.id
        ?? accounts[0]?.id
        ?? "";

    return (
        <div className="max-w-5xl mx-auto px-5">
            <h1 className="text-5xl gradient-title mb-8">{t('title')}</h1>
            {accounts.length === 0 ? (
                <Card>
                    <CardContent className="space-y-4">
                        <p>{t('noAccounts')}</p>
                        <Link href="/dashboard">
                            <Button variant="prominent">{t('goToDashboard')}</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <ImportWizard
                    accounts={accounts}
                    categories={categories}
                    profiles={profiles}
                    initialAccountId={initialAccountId}
                    accountFromUrl={Boolean(accountFromUrl)}
                />
            )}
        </div>
    )
}

export default ImportPage
