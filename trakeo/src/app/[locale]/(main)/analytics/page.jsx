import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server';
import { getDashboardData } from '@/actions/dashboard';
import AnalyticsDashboard from './_components/analytics-dashboard';


async function AnalyticsPage() {
    const { userId } = await auth();
    const t = await getTranslations('Analytics');

    if (!userId) {
        // Clerk middleware or layout usually handles this, but explicit check is good practice
        // specific redirection might happen automatically or via middleware
        return <div>Please sign in to view analytics</div>
    }

    const transactions = await getDashboardData();

    return (
        <div className="space-y-6">
            <h1 className="text-5xl gradient-title">{t('title')}</h1>

            <AnalyticsDashboard transactions={transactions} />
        </div>
    )
}

export default AnalyticsPage
