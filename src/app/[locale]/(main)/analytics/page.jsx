import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server';
import { getDashboardData, getUserAccounts } from '@/actions/dashboard'
import { getCategories } from '@/actions/categories';
import AnalyticsDashboard from './_components/analytics-dashboard';

async function AnalyticsPage() {
    const { userId } = await auth();
    const t = await getTranslations('Analytics');

    if (!userId) {
        // Clerk middleware or layout usually handles this, but explicit check is good practice
        // specific redirection might happen automatically or via middleware
        return <div>Please sign in to view analytics</div>
    }

    const [transactions, accounts, categories] = await Promise.all([
        getDashboardData(),
        getUserAccounts(),
        getCategories()
    ]);

    return (
        <div className="space-y-6">
            <h1 className="text-5xl gradient-title mb-8">{t('title')}</h1>

            <AnalyticsDashboard
                accounts={accounts}
                transactions={transactions}
                categories={categories}
            />
        </div>
    )
}

export default AnalyticsPage
