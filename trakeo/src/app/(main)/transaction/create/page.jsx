import React from 'react'
import { getUserAccounts } from '@/actions/dashboard'
import { getCategories } from '@/actions/categories';
import AddTransactionForm from '@/app/(main)/transaction/_components/transaction-form';

const AddTransactionPage = async () => {
    const accounts = await getUserAccounts();
    const categories = await getCategories();

    return (
        <div className="max-w-3xl mx-auto px-5">
            <h1 className="text-5xl gradient-title mb-8">Add Transaction</h1>
            <AddTransactionForm accounts={accounts} categories={categories} />
        </div>
    )
}

export default AddTransactionPage