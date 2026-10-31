import React from 'react'
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { getLocale, getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/currency';

// Every account added up in the default account's currency (getTotalBalance). Balances in other currencies use the
// newest ECB reference rates, so the total is then approximate and says which rates it used.
// "summary" is a row at the bottom of a card (dashboard AccountsSummary); "banner" sits on the page background (/accounts)
const TotalBalance = async ({ total, variant = "summary" }) => {
    const t = await getTranslations('Dashboard');
    const locale = await getLocale();
    const dateLocale = locale === 'es' ? es : enUS;
    const amount = formatMoney(total.total, total.currency, locale);
    const banner = variant === "banner";

    const notes = (
        <>
            {total.converted && (
                <p className={cn("text-xs", banner ? "text-orange-100" : "text-muted-foreground")}>
                    {t('totalBalanceRates', { date: format(parseISO(total.rateDate), "PP", { locale: dateLocale }) })}
                </p>
            )}
            {total.missingCurrencies.length > 0 && (
                <p className={cn("text-xs", banner ? "text-orange-50 font-medium" : "text-amber-600")}>
                    {t('totalBalanceMissing', {
                        currencies: new Intl.ListFormat(locale, { type: "conjunction" }).format(total.missingCurrencies),
                    })}
                </p>
            )}
        </>
    );

    if (banner) {
        return (
            <div className="space-y-0.5">
                <p className="text-sm font-medium text-orange-100">{t('totalBalance')}</p>
                <p className="text-3xl font-bold text-white">{total.converted ? `≈ ${amount}` : amount}</p>
                {notes}
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm text-muted-foreground">{t('totalBalance')}</p>
                <p className="text-lg font-bold whitespace-nowrap">{total.converted ? `≈ ${amount}` : amount}</p>
            </div>
            {notes}
        </div>
    )
}

export default TotalBalance
