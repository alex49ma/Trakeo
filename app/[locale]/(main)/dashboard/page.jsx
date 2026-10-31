import React, { Suspense } from 'react'
import { getUserAccounts } from '@/actions/dashboard'
import { getCurrentBudget } from '@/actions/budget'
import BudgetProgress from './_components/budget-progress'
import { getDashboardData, getTotalBalance } from '@/actions/dashboard'
import { getTranslations } from 'next-intl/server';
import DashboardOverview from './_components/dashboard-overview';
import TotalBalance from '@/components/total-balance';

async function DashboardPage() {
    const t = await getTranslations('Dashboard');

    const accounts = await getUserAccounts()

    const defaultAccount = accounts?.find((account) => account.isDefault);

    let budgetData = null;
    if (defaultAccount) {
        budgetData = await getCurrentBudget(defaultAccount.id);
    }

    const transactions = await getDashboardData();

    const totalBalance = await getTotalBalance();

    return (
        <div className="space-y-8">
            {/* Budget Progress */}
            {defaultAccount && <BudgetProgress
                initialBudget={budgetData?.budget}
                currentExpenses={budgetData?.currentExpenses || 0}
                accountCurrency={budgetData?.accountCurrency}
            />}


            {/* Overview */}
            <Suspense fallback={"Loading overview..."}>
                <DashboardOverview
                    accounts={accounts}
                    transactions={transactions || []}
                />
            </Suspense>

            {/* Total across accounts (two accounts or more) */}
            {totalBalance && <TotalBalance total={totalBalance} />}
        </div>
    )
}

export default DashboardPage