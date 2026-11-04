"use client";

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionSchema } from '@/app/lib/schema';
import useFetch from '@/hooks/use-fetch';
import { createTransaction } from '@/actions/transaction';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import CreateAccountDrawer from '@/components/create-account-drawer';
import CreateCategoryDrawer from '@/components/create-category-drawer';
import CreateSubcategoryDrawer from '@/components/create-subcategory-drawer';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Link, useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import { es, enUS } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
import { updateTransaction } from '@/actions/transaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/currency';
import { categoryLabel, isTransferCategory } from '@/lib/system-categories';

const AddTransactionForm = ({ accounts, categories, editMode = false, initialData = null }) => {

    const t = useTranslations("TransactionForm");
    const tCategory = useTranslations("CreateCategory");
    const tSubcategory = useTranslations("CreateSubcategory");
    const tCategories = useTranslations("SystemCategories");
    const locale = useLocale();
    const dateLocale = locale === 'es' ? es : enUS;

    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");

    const [categoriesState, setCategoriesState] = React.useState(categories);
    const [isSubcategoryDrawerOpen, setIsSubcategoryDrawerOpen] = React.useState(false);

    // Update state when initial categories prop changes (e.g. navigation back/forward)
    useEffect(() => {
        setCategoriesState(categories);
    }, [categories]);

    const handleCategoryCreated = (newCategory) => {
        setCategoriesState(prev => [...prev, newCategory]);
        setValue("categoryId", newCategory.id);
        // Clean subcategory
        setValue("subcategoryId", "");
    };

    const handleSubcategoryCreated = (newSubcategory) => {
        setCategoriesState(prev => prev.map(cat => {
            if (cat.id === newSubcategory.category_id) {
                return {
                    ...cat,
                    subCategories: [...(cat.subCategories || []), newSubcategory]
                }
            }
            return cat;
        }));
        setValue("subcategoryId", newSubcategory.id);
    };

    const { register, setValue, handleSubmit, formState: { errors }, watch, getValues, reset } = useForm({
        resolver: zodResolver(transactionSchema),
        defaultValues:
            editMode && initialData ?
                {
                    type: initialData.type,
                    amount: initialData.amount.toString(),
                    description: initialData.description,
                    accountId: initialData.accountId,
                    categoryId: initialData.categoryId,
                    subcategoryId: initialData.subcategoryId,
                    date: new Date(initialData.date),
                    isRecurring: initialData.isRecurring,
                    ...(initialData.recurringInterval && {
                        recurringInterval: initialData.recurringInterval,

                    }),
                } : {
                    type: "EXPENSE",
                    amount: "",
                    description: "",
                    date: new Date(),
                    accountId: accounts.find((acc) => acc.isDefault)?.id,
                    categoryId: categoriesState.find((cat) => cat.systemKey === "OTHER_EXPENSES")?.id,
                    isRecurring: false,
                },
    });

    const {
        loading: transactionLoading,
        fetchData: transactionFn,
        data: transactionResult
    } = useFetch(editMode ? updateTransaction : createTransaction);

    const type = watch("type");
    const isRecurring = watch("isRecurring");
    const date = watch("date");
    const categoryId = watch("categoryId");
    const accountId = watch("accountId");

    const selectedAccount = accounts.find((account) => account.id === accountId);
    // Moving a transaction to an account in another currency would silently relabel its amount
    const initialAccount = editMode ? accounts.find((account) => account.id === initialData?.accountId) : null;
    const currencyMismatch = Boolean(initialAccount && selectedAccount && initialAccount.currency !== selectedAccount.currency);

    const onSubmit = async (data) => {
        const formData = {
            ...data,
            amount: parseFloat(data.amount),

        };
        if (editMode) {
            transactionFn(editId, formData);
        } else {
            transactionFn(formData);
        }
    }

    useEffect(() => {
        if (transactionResult?.success && !transactionLoading) {
            toast.success(editMode ? t('updateSuccess') : t('createSuccess'));
            reset();
            router.push(`/account/${transactionResult.data.accountId}`);
        }
    }, [transactionResult, transactionLoading])

    // Transfer categories are only used by internal transfers
    const filteredCategories = categoriesState.filter((cat) => cat.type === type && !isTransferCategory(cat));
    const selectedCategory = categoriesState.find((cat) => cat.id === categoryId);
    const subcategories = selectedCategory?.subCategories || [];

    return (
        <Card className="w-full max-w-2xl mx-auto bg-card">
            <CardHeader>
                <CardTitle className="text-xl font-bold">{editMode ? t('editTransaction') : t('newTransaction')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    {/* Receipt Scanner */}

                    {/* Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('type')}</label>
                        <Select
                            onValueChange={(value) => {
                                setValue("type", value);
                                setValue("categoryId", "");
                                setValue("subcategoryId", "");
                            }}
                            value={type}
                        >
                            <SelectTrigger className="w-full bg-background">
                                <SelectValue placeholder={t('selectType')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EXPENSE">{t('expense')}</SelectItem>
                                <SelectItem value="INCOME">{t('income')}</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.type && <p className="text-red-500">{errors.type.message}</p>}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Amount */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {t('amount')}{selectedAccount && ` (${selectedAccount.currency})`}
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="bg-background"
                                {...register("amount")}
                            />
                            {errors.amount && <p className="text-red-500">{errors.amount.message}</p>}
                        </div>
                        {/* Account */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('account')}</label>
                            <Select
                                onValueChange={(value) => setValue("accountId", value)}
                                defaultValue={getValues("accountId")}
                            >
                                <SelectTrigger className="w-full bg-background">
                                    <SelectValue placeholder={t('selectAccount')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.name} ({formatMoney(account.balance, account.currency, locale)})
                                        </SelectItem>
                                    ))}
                                    <CreateAccountDrawer>
                                        <Button variant="ghost" className="w-full select-none items-center text-sm outline-none">{t('createAccount')}</Button>
                                    </CreateAccountDrawer>
                                </SelectContent>
                            </Select>
                            {errors.accountId && <p className="text-red-500">{errors.accountId.message}</p>}
                            {currencyMismatch && <p className="text-sm text-red-500">{t('currencyMismatch')}</p>}
                        </div>
                    </div>
                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('category')}</label>
                        <div className="flex gap-2">
                            <Select
                                onValueChange={(value) => {
                                    setValue("categoryId", value);
                                    setValue("subcategoryId", ""); // Reset subcategory when category changes
                                }}
                                value={categoryId}
                            >
                                <SelectTrigger className="w-full bg-background">
                                    <SelectValue placeholder={t('selectCategory')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredCategories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {categoryLabel(category, tCategories)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <CreateCategoryDrawer onCategoryCreated={handleCategoryCreated} initialType={type}>
                                <Button variant="outline" className="px-3" type="button">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </CreateCategoryDrawer>
                        </div>
                        {errors.categoryId && <p className="text-red-500">{errors.categoryId.message}</p>}
                    </div>

                    {/* Sub Category */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('subCategory')}</label>
                        <Select
                            onValueChange={(value) => setValue("subcategoryId", value === "none" ? "" : value)}
                            value={watch("subcategoryId") || "none"}
                            disabled={!categoryId}
                        >
                            <SelectTrigger className="w-full bg-background">
                                <SelectValue placeholder={t('selectSubCategory')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    {t('none')}
                                </SelectItem>
                                {subcategories.map((subcat) => (
                                    <SelectItem key={subcat.id} value={subcat.id}>
                                        {subcat.name}
                                    </SelectItem>
                                ))}
                                <Button
                                    variant="ghost"
                                    className="w-full select-none items-center text-sm outline-none font-normal justify-start px-2 py-1.5 h-auto"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsSubcategoryDrawerOpen(true);
                                    }}
                                >
                                    {tSubcategory('title')}
                                </Button>
                            </SelectContent>
                        </Select>
                        <CreateSubcategoryDrawer
                            categoryId={categoryId}
                            onSubcategoryCreated={handleSubcategoryCreated}
                            open={isSubcategoryDrawerOpen}
                            onOpenChange={setIsSubcategoryDrawerOpen}
                        >
                            <span className="hidden"></span>
                        </CreateSubcategoryDrawer>
                        {errors.subcategoryId && <p className="text-red-500">{errors.subcategoryId.message}</p>}
                    </div>
                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('date')}</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full pl-3 text-left font-normal bg-background">
                                    {date ? format(date, "PPP", { locale: dateLocale }) : <span>{t('chooseDate')}</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent>
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(date) => setValue("date", date)}
                                    disabled={(date) =>
                                        date > new Date() ||
                                        date < new Date("1900-01-01")}
                                    initialFocus
                                    locale={dateLocale}
                                />
                            </PopoverContent>
                        </Popover>
                        {errors.date && <p className="text-red-500">{errors.date.message}</p>}
                    </div>
                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('description')}</label>
                        <Input
                            type="text"
                            placeholder={t('enterDescription')}
                            className="bg-background"
                            {...register("description")}
                        />
                        {errors.description && <p className="text-red-500">{errors.description.message}</p>}
                    </div>
                    {/* Is Recurring */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <label htmlFor="isDefault" className="text-sm font-medium cursor-pointer">{t('recurring')}</label>
                            <p className="text-sm text-muted-foreground">{t('recurringDescription')}</p>
                        </div>
                        <Switch
                            checked={isRecurring}
                            onCheckedChange={(checked) => setValue("isRecurring", checked)}
                        />
                    </div>

                    {/* Recurring Interval */}
                    {isRecurring && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('recurringInterval')}</label>
                            <Select
                                onValueChange={(value) => setValue("recurringInterval", value)}
                                defaultValue={getValues("recurringInterval")}
                            >
                                <SelectTrigger className="w-full bg-background">
                                    <SelectValue placeholder={t('selectInterval')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DAILY">{t('daily')}</SelectItem>
                                    <SelectItem value="WEEKLY">{t('weekly')}</SelectItem>
                                    <SelectItem value="MONTHLY">{t('monthly')}</SelectItem>
                                    <SelectItem value="YEARLY">{t('yearly')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.recurringInterval && (
                                <p className="text-sm text-red-500">
                                    {errors.recurringInterval.message}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Submit and cancel */}
                    <div className="flex gap-4">
                        <Button type="button" variant="prominentCancel" className="flex-1" onClick={() => router.back()}>{t('cancel')}</Button>
                        <Button type="submit" variant="prominent" className="flex-1" disabled={transactionLoading || currencyMismatch}>{t('save')}</Button>
                    </div>

                    {/* CSV import: its own page, into the account selected here */}
                    {!editMode && (
                        <Button type="button" variant="prominentPurple" className="w-full mt-4" asChild>
                            <Link href={accountId ? `/transaction/import?account=${accountId}` : "/transaction/import"}>
                                <Upload className="mr-2 h-4 w-4" />
                                {t('importCsv')}
                            </Link>
                        </Button>
                    )}

                </form>
            </CardContent>
        </Card >
    )
}

export default AddTransactionForm