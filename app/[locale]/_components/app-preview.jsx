import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { SAMPLE } from "@/data/landing";
import { Donut, Swatch } from "./donut";

// From lg the four cards float over each other, positioned for a 566px column (the hero's right column at xl).
// At lg that column is narrower (441px at 1024px), so the collage is zoomed out rather than rearranged.
// Below lg the cards stack without rotation, and phones show only the budget and the accounts
const FLOATING = "relative z-10 gap-0 rounded-[16px] leading-[normal] shadow-[0_24px_48px_-16px_rgba(67,20,7,0.45)] lg:absolute";

export default function AppPreview() {
    const t = useTranslations("Landing");
    const locale = useLocale();
    const money = (amount, currency = "EUR") => formatMoney(amount, currency, locale);
    const percent = new Intl.NumberFormat(locale, { style: "percent" });
    const { spent, limit } = SAMPLE.budget;
    const used = (spent / limit) * 100;

    return (
        <div
            role="img"
            aria-label={t("preview.label")}
            className="relative mx-auto w-full max-w-lg lg:mx-0 lg:h-[540px] lg:w-[566px] lg:max-w-none lg:justify-self-center lg:[zoom:0.775] xl:w-full xl:[zoom:1]"
        >
            <div aria-hidden="true" className="flex flex-col gap-4 lg:block">
                <Card className={cn(FLOATING, "p-[22px] lg:left-0 lg:top-2.5 lg:w-[380px] lg:-rotate-2")}>
                    <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{t("mock.monthlyBudget")}</span>
                        <span className="text-[12px] text-[#6b6b6b]">{t("mock.budgetUsed", { percent: Math.round(used) })}</span>
                    </div>
                    <div className="mt-1 text-[13px] text-[#6b6b6b]">
                        {t("mock.budgetSpent", { spent: money(spent), budget: money(limit) })}
                    </div>
                    <Progress value={used} className="mt-3.5 h-2.5 bg-neutral-100" extraStyles="rounded-full bg-green-500" />
                </Card>

                <Card className={cn(FLOATING, "hidden p-5 sm:flex lg:right-0 lg:top-[70px] lg:w-[300px]")}>
                    <div className="mb-2.5 font-semibold">{t("mock.expensesBreakdown")}</div>
                    <div className="flex items-center gap-4">
                        <Donut slices={SAMPLE.breakdown} size={110} />
                        <ul className="flex flex-col gap-1.5 text-[12px] text-neutral-700">
                            {SAMPLE.breakdown.map(({ key, percent: share, swatch }) => (
                                <li key={key} className="flex items-center gap-1.5">
                                    <Swatch className={swatch} />
                                    {t(`sample.categories.${key}`)} {percent.format(share / 100)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>

                <Card className={cn(FLOATING, "p-[18px_20px_8px] lg:left-10 lg:top-[170px] lg:w-[360px]")}>
                    <div className="mb-1.5 font-semibold">{t("mock.accounts")}</div>
                    {SAMPLE.accounts.map(({ key, currency, balance }) => (
                        <div key={key} className="flex items-center justify-between gap-3 border-t border-neutral-100 py-2.5">
                            <div>
                                <div className="text-[14px] font-medium">{t(`sample.${key}`)}</div>
                                <div className="text-[12px] text-[#6b6b6b]">
                                    {t("sample.current")} · {currency}
                                </div>
                            </div>
                            <span className="shrink-0 whitespace-nowrap font-bold">{money(balance, currency)}</span>
                        </div>
                    ))}
                </Card>

                <Card className={cn(FLOATING, "hidden px-5 py-[18px] sm:flex lg:right-5 lg:top-[330px] lg:w-[330px]")}>
                    <div className="mb-2.5 text-[12px] font-semibold tracking-[0.06em] text-[#6b6b6b] uppercase">
                        {t("preview.recent")}
                    </div>
                    <RecentRow label={t("sample.salary")} amount={`+ ${money(SAMPLE.salary.amount)}`} className="text-green-700" />
                    <RecentRow label={t("sample.groceries")} amount={`− ${money(SAMPLE.groceries)}`} className="text-red-700" />
                    <RecentRow
                        label={t("preview.transfer", { from: "EUR", to: "CZK" })}
                        amount={money(SAMPLE.transfer.amount)}
                        className="text-neutral-700"
                    />
                </Card>
            </div>
        </div>
    );
}

function RecentRow({ label, amount, className }) {
    return (
        <div className="flex items-center justify-between gap-3 py-1.5 text-[14px]">
            <span className="font-medium">{label}</span>
            <span className={cn("shrink-0 whitespace-nowrap font-semibold", className)}>{amount}</span>
        </div>
    );
}
