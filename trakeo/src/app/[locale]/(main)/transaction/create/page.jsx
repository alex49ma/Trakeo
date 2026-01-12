// Rewriting to client component or using getTranslations
import React from 'react'
import { getUserAccounts } from '@/actions/dashboard'
import { getCategories } from '@/actions/categories';
import AddTransactionForm from '../_components/transaction-form';
import { getTranslations } from 'next-intl/server';

const AddTransactionPage = async () => {
    const accounts = await getUserAccounts();
    const categories = await getCategories();
    const t = await getTranslations('TransactionForm');

    return (
        <div className="max-w-3xl mx-auto px-5">
            <h1 className="text-5xl gradient-title mb-8">{t('title')}</h1>
            <AddTransactionForm accounts={accounts} categories={categories} />
        </div>
    )
}

export default AddTransactionPage