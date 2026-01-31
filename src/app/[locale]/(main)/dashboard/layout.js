import React, { Suspense } from 'react'
import DashboardPage from './page'
import { BarLoader } from 'react-spinners'

import { getTranslations } from 'next-intl/server';

const DashboardLayout = async ({ children }) => {
    const t = await getTranslations('Dashboard');

    return (
        <div className="px-5">
            <h1 className="text-6xl font-bold gradient-title mb-5">{t('title')}</h1>

            <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#78290f" />}>
                <DashboardPage />
            </Suspense>

        </div>
    )
}

export default DashboardLayout