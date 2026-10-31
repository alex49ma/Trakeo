import React from 'react'
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { getLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/currency';

// Every account added up in the default account's currency (getTotalBalance). Balances in other currencies use the
// newest ECB reference rates, so the total is then approximate and says which rates it used
const TotalBalance = async ({ total }) => {
    const t = await getTranslations('Dashboard');
    const locale = await getLocale();
    const dateLocale = locale === 'es' ? es : enUS;
    const amount = formatMoney(total.total, total.currency, locale);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('totalBalance')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
                <div className="text-2xl font-bold">{total.converted ? `≈ ${amount}` : amount}</div>
                {total.converted && (
                    <p className="text-xs text-muted-foreground">
                        {t('totalBalanceRates', { date: format(parseISO(total.rateDate), "PP", { locale: dateLocale }) })}
                    </p>
                )}
                {total.missingCurrencies.length > 0 && (
                    <p className="text-xs text-amber-600">
                        {t('totalBalanceMissing', {
                            currencies: new Intl.ListFormat(locale, { type: "conjunction" }).format(total.missingCurrencies),
                        })}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

export default TotalBalance
