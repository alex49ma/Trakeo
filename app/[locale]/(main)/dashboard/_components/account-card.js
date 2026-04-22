"use client";

import React from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import useFetch from '@/hooks/use-fetch';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { updateDefaultAccount } from "@/actions/accounts";

import { useTranslations } from 'next-intl';

const AccountCard = ({ account }) => {
    const { name, type, balance, id, isDefault } = account;
    const t = useTranslations('Dashboard');
    const common = useTranslations('Common');

    const {
        loading: updateDefaultLoading,
        fetchData: updateDefaultfn,
        data: updatedAccount,
        error,
    } = useFetch(updateDefaultAccount);

    const handleDefaultChange = async (event) => {
        event.preventDefault();
        if (isDefault) {
            toast.warning(t('oneDefaultRequired'));
            return;
        }
        await updateDefaultfn(id);
    }

    useEffect(() => {
        if (updatedAccount?.success) {
            toast.success(t('defaultAccountUpdated'));
        }
    }, [updatedAccount]);

    useEffect(() => {
        if (error) {
            toast.error(error.message || t('defaultAccountUpdateError'));
        }
    }, [error]);

    return (
        <Card className="hover:shadow-md transition-shadow group relative">
            <Link href={`account/${id}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium capitalize">{name}</CardTitle>
                    <Switch
                        checked={isDefault}
                        onClick={handleDefaultChange}
                        disabled={updateDefaultLoading} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {parseFloat(balance).toFixed(2)}€
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {common('accountType.' + type.toUpperCase())}
                    </p>
                </CardContent>
                <CardFooter className="flex justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                        <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                        <p>{common('income')}</p>
                    </div>
                    <div className="flex items-center">
                        <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                        <p>{common('expense')}</p>
                    </div>
                </CardFooter>
            </Link>
        </Card>
    )
}

export default AccountCard