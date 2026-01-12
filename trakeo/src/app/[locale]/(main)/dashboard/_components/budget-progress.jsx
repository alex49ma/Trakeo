"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react'
import { updateBudget } from '@/actions/budget';
import useFetch from '@/hooks/use-fetch';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { useEffect } from 'react';

import { useTranslations } from 'next-intl';

const BudgetProgress = ({ initialBudget, currentExpenses }) => {
    const t = useTranslations('Dashboard');
    const [isEditing, setIsEditing] = useState(false);
    const [newBudget, setNewBudget] = useState(
        initialBudget?.amount?.toString() || ''
    );

    const percentUsed = initialBudget ? (currentExpenses / initialBudget.amount) * 100 : 0;

    const {
        loading: isLoading,
        fetchData: updateBudgetFn,
        data: updatedBudget,
        error,
    } = useFetch(updateBudget);

    const handleUpdateBudget = async () => {
        const amount = parseFloat(newBudget);

        if (isNaN(amount) || amount <= 0) {
            toast.error(t('invalidAmount'));
            return;
        }

        await updateBudgetFn(amount);
    };

    useEffect(() => {
        if (updatedBudget) {
            setIsEditing(false);
            toast.success(t('updateBudgetSuccess'));
        }
    }, [updatedBudget]);

    useEffect(() => {
        if (error) {
            toast.error(error.message || t('updateBudgetError'));
        }
    }, [error]);

    const handleCancel = () => {
        setNewBudget(initialBudget?.amount?.toString() || '');
        setIsEditing(false);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex-1">
                    <CardTitle>{t('monthlyBudget')}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                        {isEditing ?
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={newBudget}
                                    onChange={(e) => setNewBudget(e.target.value)}
                                    className="w-32"
                                    placeholder={t('enterAmount')}
                                    disabled={isLoading}
                                    autoFocus
                                />
                                <Button variant="ghost" size="icon" onClick={handleUpdateBudget} disabled={isLoading}>
                                    <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isLoading}>
                                    <X className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                            : <>
                                <CardDescription>
                                    {initialBudget ? t('budgetSpent', { spent: currentExpenses.toFixed(2), budget: initialBudget.amount.toFixed(2) }) : t('noBudgetSet')}
                                </CardDescription>
                                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-6 w-6" disabled={isLoading}>
                                    <Pencil className="h-3 w-3" />
                                </Button>

                            </>
                        }
                    </div>
                </div>

            </CardHeader>
            <CardContent>
                {initialBudget && <div className="space-y-2">
                    <Progress
                        value={percentUsed}
                        extraStyles={`${percentUsed >= 90 ? 'bg-red-500'
                            : percentUsed >= 75 ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                        {t('budgetUsed', { percent: percentUsed.toFixed(2) })}
                    </p>
                </div>}
            </CardContent>
        </Card>
    )
}

export default BudgetProgress