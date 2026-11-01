import React, { Suspense } from 'react'
import { BarLoader } from 'react-spinners'

import { getTranslations } from 'next-intl/server';

// Unlike the dashboard, the title is rendered by the page: it shares a row with buttons that depend on the accounts.
// The fallback repeats it so the title doesn't pop in after loading
const AccountsLayout = async ({ children }) => {
    const t = await getTranslations('Accounts');

    return (
        <div className="px-5">
            <Suspense fallback={
                <>
                    <h1 className="text-6xl font-bold gradient-title mb-5">{t('title')}</h1>
                    <BarLoader className="mt-4" width={"100%"} color="#78290f" />
                </>
            }>
                {children}
            </Suspense>
        </div>
    )
}

export default AccountsLayout
