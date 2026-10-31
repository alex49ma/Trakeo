// Rewriting to client component or using getTranslations
import React from 'react'
import { getUserAccounts } from '@/actions/dashboard'
import { getCategories } from '@/actions/categories';
import AddTransactionForm from '../_components/transaction-form';
import { getLocale, getTranslations } from 'next-intl/server';
import { getTransaction } from '@/actions/transaction';
import { redirect } from '@/i18n/navigation';

const AddTransactionPage = async (props) => {
    const searchParams = await props.searchParams;
    const accounts = await getUserAccounts();
    const categories = await getCategories();
    const t = await getTranslations('TransactionForm');

    const editId = searchParams?.edit;

    let initialData = null;
    if (editId) {
        const transaction = await getTransaction(editId);
        // Transfer transactions are edited as a whole, in the transfer form
        if (transaction.transferId) {
            redirect({ href: `/transaction/transfer?edit=${transaction.transferId}`, locale: await getLocale() });
        }
        initialData = transaction;
    }

    return (
        <div className="max-w-3xl mx-auto px-5">
            <h1 className="text-5xl gradient-title mb-8">
                {editId ? t('editTitle') : t('title')}
            </h1>
            <AddTransactionForm accounts={accounts} categories={categories} editMode={!!editId} initialData={initialData} />
        </div>
    )
}

export default AddTransactionPage