import React, { Suspense } from 'react'
import { getUserAccounts } from '@/actions/dashboard'
import { getCurrentBudget } from '@/actions/budget'
import BudgetProgress from './_components/budget-progress'
import { getDashboardData, getTotalBalance } from '@/actions/dashboard'
import DashboardOverview from './_components/dashboard-overview';
import AccountsSummary from './_components/accounts-summary';

async function DashboardPage() {
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

            {/* Recent transactions, expenses breakdown and accounts; one column below lg */}
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr_380px] items-start">
                <Suspense fallback={"Loading overview..."}>
                    <DashboardOverview
                        accounts={accounts}
                        transactions={transactions || []}
                    />
                </Suspense>

                <AccountsSummary accounts={accounts} totalBalance={totalBalance} />
            </div>
        </div>
    )
}

export default DashboardPage