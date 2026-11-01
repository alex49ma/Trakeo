"use client";

import React from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowUpRight, ArrowDownRight, MoreVertical } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import useFetch from '@/hooks/use-fetch';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { updateDefaultAccount } from "@/actions/accounts";
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/currency';
import DefaultPill from './default-pill';

import { useLocale, useTranslations } from 'next-intl';

const AccountCard = ({ account }) => {
    const { name, type, balance, id, isDefault, currency, monthIncome, monthExpense } = account;
    const t = useTranslations('Accounts');
    const dashboard = useTranslations('Dashboard');
    const common = useTranslations('Common');
    const locale = useLocale();

    const {
        loading: updateDefaultLoading,
        fetchData: updateDefaultfn,
        data: updatedAccount,
        error,
    } = useFetch(updateDefaultAccount);

    useEffect(() => {
        if (updatedAccount?.success) {
            toast.success(dashboard('defaultAccountUpdated'));
        } else if (updatedAccount) {
            // updateDefaultAccount returns its errors instead of throwing them
            toast.error(updatedAccount.error || dashboard('defaultAccountUpdateError'));
        }
    }, [updatedAccount]);

    useEffect(() => {
        if (error) {
            toast.error(error.message || dashboard('defaultAccountUpdateError'));
        }
    }, [error]);

    // The name's link stretches over the whole card (after:inset-0); the menu sits above it, so opening the menu
    // never navigates and there's no button nested inside the link
    return (
        <Card className="hover:shadow-md transition-shadow relative gap-4">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <CardTitle className="font-semibold capitalize truncate">
                        <Link href={`/account/${id}`} className="after:absolute after:inset-0 after:rounded-xl">
                            {name}
                        </Link>
                    </CardTitle>
                    {isDefault && <DefaultPill label={t('default')} />}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="relative z-10 -mr-2 text-muted-foreground"
                            aria-label={t('accountOptions')}
                            disabled={updateDefaultLoading}
                        >
                            <MoreVertical />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={isDefault} onSelect={() => updateDefaultfn(id)}>
                            {t('makeDefault')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-1">
                <div className="text-3xl font-bold">
                    {formatMoney(balance, currency, locale)}
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                        {common('accountType.' + type.toUpperCase())}
                    </p>
                    <Badge variant="outline">{currency}</Badge>
                </div>
            </CardContent>
            <CardFooter className="mx-6 px-0 border-t [.border-t]:pt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                <p className="text-muted-foreground">{t('thisMonth')}</p>
                <div className="flex items-center gap-4">
                    <div className="flex items-center text-green-700">
                        <ArrowUpRight className="mr-1 h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{common('income')}: </span>
                        {formatMoney(monthIncome, currency, locale)}
                    </div>
                    <div className="flex items-center text-red-700">
                        <ArrowDownRight className="mr-1 h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{common('expense')}: </span>
                        {formatMoney(monthExpense, currency, locale)}
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}

export default AccountCard
