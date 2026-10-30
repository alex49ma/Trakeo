import React from 'react'
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserAccounts } from '@/actions/dashboard';
import { getTransfer } from '@/actions/transfer';
import TransferForm from '../_components/transfer-form';

const TransferPage = async (props) => {
    const searchParams = await props.searchParams;
    const accounts = await getUserAccounts();
    const t = await getTranslations('Transfer');

    const editId = searchParams?.edit;

    let initialData = null;
    if (editId) {
        initialData = await getTransfer(editId);
        if (!initialData) notFound();
    }

    // Source account: the transfer's when editing, the account page it was opened from, or the default account
    const defaultFromAccountId = initialData?.fromAccountId
        ?? accounts.find((account) => account.id === searchParams?.from)?.id
        ?? accounts.find((account) => account.isDefault)?.id
        ?? "";

    return (
        <div className="max-w-3xl mx-auto px-5">
            <h1 className="text-5xl gradient-title mb-8">
                {editId ? t('editTitle') : t('title')}
            </h1>
            <TransferForm accounts={accounts} initialData={initialData} defaultFromAccountId={defaultFromAccountId} />
        </div>
    )
}

export default TransferPage
