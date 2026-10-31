"use client";

import React, { useEffect, useRef, useState } from 'react'
import Big from 'big.js';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import useFetch from '@/hooks/use-fetch';
import { createTransfer, updateTransfer } from '@/actions/transfer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import CreateAccountDrawer from '@/components/create-account-drawer';
import { currencyDecimals, currencySymbol, formatMoney, formatRate } from '@/lib/currency';
import { DERIVED_FIELD_ENUM, DERIVED_FIELD_NAME, EXCHANGE_FIELDS, displayRate, inverseRate, resolveExchange } from '@/lib/exchange';

const TransferForm = ({ accounts, initialData = null, defaultFromAccountId = "" }) => {
    const t = useTranslations('Transfer');
    const locale = useLocale();
    const dateLocale = locale === 'es' ? es : enUS;
    const router = useRouter();
    const editMode = !!initialData;

    const [fromAccountId, setFromAccountId] = useState(initialData?.fromAccountId ?? defaultFromAccountId);
    const [toAccountId, setToAccountId] = useState(initialData?.toAccountId ?? "");
    const [values, setValues] = useState({
        fromAmount: initialData ? String(initialData.fromAmount) : "",
        rate: initialData ? String(initialData.rate) : "",
        toAmount: initialData ? String(initialData.toAmount) : "",
    });
    // The two most recently typed exchange fields are the inputs; the third one is calculated from them
    const [inputs, setInputs] = useState(
        initialData
            ? EXCHANGE_FIELDS.filter((field) => field !== DERIVED_FIELD_NAME[initialData.derivedField])
            : ["fromAmount", "rate"]
    );
    const [fee, setFee] = useState(initialData?.fee ? String(initialData.fee) : "");
    const [date, setDate] = useState(initialData ? new Date(initialData.date) : new Date());
    const [description, setDescription] = useState(initialData?.description ?? "");
    const submitting = useRef(false);

    const fromAccount = accounts.find((account) => account.id === fromAccountId);
    const toAccount = accounts.find((account) => account.id === toAccountId);
    const sameCurrency = Boolean(fromAccount && toAccount && fromAccount.currency === toAccount.currency);
    const derivedField = sameCurrency ? "toAmount" : EXCHANGE_FIELDS.find((field) => !inputs.includes(field));

    const result = fromAccount && toAccount
        ? resolveExchange({
            ...values,
            fee,
            derivedField,
            sameCurrency,
            fromDecimals: currencyDecimals(fromAccount.currency),
            toDecimals: currencyDecimals(toAccount.currency),
        })
        : null;
    const resolved = result && !result.error ? result : null;
    const error = result?.error;

    const {
        loading: transferLoading,
        fetchData: transferFn,
        data: transferResult,
    } = useFetch(editMode ? updateTransfer : createTransfer);

    useEffect(() => {
        if (transferResult?.success && !transferLoading) {
            toast.success(editMode ? t('updateSuccess') : t('createSuccess'));
            router.push(`/account/${transferResult.data.fromAccountId}`);
        }
    }, [transferResult, transferLoading]);

    // What an exchange field shows: what was typed, or the calculated value
    const shownValue = (field) => {
        if (field !== derivedField) return values[field];
        if (!resolved) return "";
        return field === "rate" ? displayRate(resolved.rate) : resolved[field];
    };

    const handleValueChange = (field, value) => {
        setValues((current) => ({ ...current, [field]: value }));
        setInputs((current) => [...current.filter((name) => name !== field), field].slice(-2));
    };

    const currencyPair = (fromId, toId) => {
        const from = accounts.find((account) => account.id === fromId);
        const to = accounts.find((account) => account.id === toId);
        return from && to ? `${from.currency}-${to.currency}` : null;
    };

    const changeAccounts = (nextFromId, nextToId) => {
        const previousPair = currencyPair(fromAccountId, toAccountId);
        const nextPair = currencyPair(nextFromId, nextToId);
        // An old rate means nothing for another currency pair: keep the amount deducted, clear the rest
        if (previousPair && nextPair && previousPair !== nextPair) {
            setValues({ fromAmount: shownValue("fromAmount"), rate: "", toAmount: "" });
            setInputs(["fromAmount", "rate"]);
        }
        setFromAccountId(nextFromId);
        setToAccountId(nextToId);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!resolved || submitting.current) return;
        submitting.current = true;

        const payload = {
            fromAccountId,
            toAccountId,
            // Only the typed values: the server calculates the derived one itself
            ...Object.fromEntries(
                EXCHANGE_FIELDS.filter((field) => field !== derivedField).map((field) => [field, values[field]])
            ),
            fee,
            derivedField: DERIVED_FIELD_ENUM[derivedField],
            date,
            description,
        };

        if (editMode) {
            await transferFn(initialData.id, payload);
        } else {
            await transferFn(payload);
        }
        submitting.current = false;
    };

    const fieldError = (field) =>
        error && error.field === field && error.code !== "required"
            ? t(`errors.${error.code}`, { decimals: error.decimals ?? 2 })
            : null;

    const fromSymbol = fromAccount ? currencySymbol(fromAccount.currency, locale) : "";
    const toSymbol = toAccount ? currencySymbol(toAccount.currency, locale) : "";
    const goesNegative = Boolean(resolved && fromAccount && new Big(fromAccount.balance).minus(resolved.fromAmount).lt(0));

    const summary = resolved && (() => {
        const parts = {
            fromAmount: formatMoney(resolved.fromAmount, fromAccount.currency, locale),
            toAmount: formatMoney(resolved.toAmount, toAccount.currency, locale),
            fee: formatMoney(resolved.fee, fromAccount.currency, locale),
            fromAccount: fromAccount.name,
            toAccount: toAccount.name,
        };
        if (new Big(resolved.fee).gt(0)) return t('summaryWithFee', parts);
        return sameCurrency ? t('summarySameCurrency', parts) : t('summary', parts);
    })();

    const accountOption = (account) => (
        <SelectItem key={account.id} value={account.id}>
            {account.name} · {formatMoney(account.balance, account.currency, locale)}
        </SelectItem>
    );

    // A plain render helper, not a component, so inputs keep their focus between renders
    const renderAmountField = (field, label, symbol, step = "0.01") => {
        const calculated = field === derivedField;
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <label htmlFor={field} className="text-sm font-medium">{label}</label>
                    {calculated && (
                        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t('calculated')}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        id={field}
                        type="number"
                        step={step}
                        inputMode="decimal"
                        placeholder="0.00"
                        className={calculated ? "bg-muted" : "bg-background"}
                        value={shownValue(field)}
                        onChange={(event) => handleValueChange(field, event.target.value)}
                    />
                    {symbol && <span className="text-sm text-muted-foreground whitespace-nowrap">{symbol}</span>}
                </div>
                {fieldError(field) && <p className="text-sm text-red-500">{fieldError(field)}</p>}
            </div>
        );
    };

    return (
        <Card className="w-full max-w-2xl mx-auto bg-card">
            <CardHeader>
                <CardTitle className="text-xl font-bold">{editMode ? t('editTransfer') : t('newTransfer')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {/* Accounts */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('fromAccount')}</label>
                            <Select
                                value={fromAccountId}
                                onValueChange={(id) => changeAccounts(id, id === toAccountId ? "" : toAccountId)}
                            >
                                <SelectTrigger className="w-full bg-background">
                                    <SelectValue placeholder={t('selectAccount')} />
                                </SelectTrigger>
                                {/* popper: the default positioning lines up the selected item, and without items the list ends up in a screen corner */}
                                <SelectContent position="popper">
                                    {accounts.map(accountOption)}
                                    <CreateAccountDrawer>
                                        <Button variant="ghost" className="w-full select-none items-center text-sm outline-none">{t('createAccount')}</Button>
                                    </CreateAccountDrawer>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('toAccount')}</label>
                            <Select value={toAccountId} onValueChange={(id) => changeAccounts(fromAccountId, id)}>
                                <SelectTrigger className="w-full bg-background">
                                    <SelectValue placeholder={t('selectAccount')} />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                    {accounts.filter((account) => account.id !== fromAccountId).map(accountOption)}
                                    <CreateAccountDrawer>
                                        <Button variant="ghost" className="w-full select-none items-center text-sm outline-none">{t('createAccount')}</Button>
                                    </CreateAccountDrawer>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {fromAccount && toAccount && (
                        <>
                            {sameCurrency ? (
                                renderAmountField("fromAmount", t('amount'), fromSymbol)
                            ) : (
                                <div className="space-y-4 rounded-lg border p-4">
                                    <p className="text-sm font-medium">{t('currencyExchange')}</p>
                                    {renderAmountField("fromAmount", t('amountDeducted'), fromSymbol)}
                                    {renderAmountField("rate", `${t('exchangeRate')} (1 ${fromSymbol} = … ${toSymbol})`, toSymbol, "any")}
                                    {resolved && (
                                        <p className="text-xs text-muted-foreground">
                                            {t('inverseRate', { rate: formatRate(inverseRate(resolved.rate), toAccount.currency, fromAccount.currency, locale, 4) })}
                                        </p>
                                    )}
                                    {renderAmountField("toAmount", t('amountReceived'), toSymbol)}
                                    {error?.code === "required" && (
                                        <p className="text-xs text-muted-foreground">{t('twoOfThreeHint')}</p>
                                    )}
                                </div>
                            )}

                            {/* Fee, in the source currency */}
                            <div className="space-y-2">
                                <label htmlFor="fee" className="text-sm font-medium">{t('fee')}</label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="fee"
                                        type="number"
                                        step="0.01"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        className="bg-background"
                                        value={fee}
                                        onChange={(event) => setFee(event.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">{fromSymbol}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{t('feeHint')}</p>
                                {fieldError("fee") && <p className="text-sm text-red-500">{fieldError("fee")}</p>}
                            </div>
                        </>
                    )}

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
                                    onSelect={(day) => day && setDate(day)}
                                    disabled={(day) =>
                                        day > new Date() ||
                                        day < new Date("1900-01-01")}
                                    initialFocus
                                    locale={dateLocale}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('description')}</label>
                        <Input
                            type="text"
                            placeholder={t('enterDescription')}
                            className="bg-background"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />
                    </div>

                    {summary && <p className="text-sm">{summary}</p>}
                    {goesNegative && <p className="text-sm text-amber-600">{t('negativeBalance', { account: fromAccount.name })}</p>}

                    {/* Submit and cancel */}
                    <div className="flex gap-4">
                        <Button type="button" variant="prominentCancel" className="flex-1" onClick={() => router.back()}>{t('cancel')}</Button>
                        <Button type="submit" variant="prominent" className="flex-1" disabled={!resolved || transferLoading}>{t('save')}</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

export default TransferForm
