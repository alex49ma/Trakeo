import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { getAnalyticsData, getUserAccounts } from '@/actions/dashboard'
import { getCategories } from '@/actions/categories';
import AnalyticsDashboard from './_components/analytics-dashboard';

async function AnalyticsPage() {
    const user = await getCurrentUser();
    const t = await getTranslations('Analytics');

    if (!user) {
        // The middleware already sends signed-out visitors to sign in; this is a fallback
        return <div>Please sign in to view analytics</div>
    }

    const [{ transactions, reportingCurrency, hasRates }, accounts, categories] = await Promise.all([
        getAnalyticsData(),
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
                reportingCurrency={reportingCurrency}
                hasRates={hasRates}
            />
        </div>
    )
}

export default AnalyticsPage
