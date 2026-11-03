import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUpRight, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatRate } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { SAMPLE } from "@/data/landing";
import { Donut, Swatch } from "./donut";

// The timeline's pictures of the app, built from the real components so they look like it. They aren't
// interactive: month-timeline.jsx wraps each one in an inert, aria-hidden frame, and the row's text says what it shows.
// Text uses the browser's normal line height, as in the design, so the sizes below are in px
const LIFT = "gap-0 rounded-[16px] leading-[normal] shadow-[0_18px_36px_-18px_rgba(124,45,18,0.45)]";
const MUTED = "text-[#6b6b6b]";

const shortDate = (locale, date) =>
    new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(date);

function FieldLabel({ className, children }) {
    return <div className={cn("mb-1.5 mt-3 text-[13px] font-medium", className)}>{children}</div>;
}

// Day 0
export function SignUpMock() {
    const t = useTranslations("Landing");

    return (
        <Card className={cn(LIFT, "p-[22px]")}>
            <div className="text-[17px] font-bold">{t("mock.createAccount")}</div>
            <FieldLabel>{t("mock.accountName")}</FieldLabel>
            <Input readOnly defaultValue={t("sample.mainAccount")} />
            <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                    <FieldLabel>{t("mock.accountType")}</FieldLabel>
                    <Input readOnly defaultValue={t("mock.currentAccount")} />
                </div>
                <div className="min-w-0">
                    <FieldLabel>{t("mock.currency")}</FieldLabel>
                    <Input readOnly defaultValue="EUR" />
                </div>
            </div>
            <Button type="button" className="mt-[18px] h-10 w-full">
                {t("mock.createAccount")}
            </Button>
        </Card>
    );
}

// Day 1
export function SalaryMock() {
    const t = useTranslations("Landing");
    const locale = useLocale();

    return (
        <Card className={cn(LIFT, "px-5 py-[18px]")}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <ArrowUpRight className="size-[18px]" />
                    </div>
                    <div>
                        <div className="font-semibold">{t("sample.salary")}</div>
                        <div className={cn("text-[13px]", MUTED)}>
                            {t("sample.mainAccount")} · {shortDate(locale, SAMPLE.salary.date)}
                        </div>
                    </div>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[17px] font-bold text-green-700">
                    + {formatMoney(SAMPLE.salary.amount, "EUR", locale)}
                </span>
            </div>
        </Card>
    );
}

function TransferSide({ label, account, amount, className }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-neutral-100 bg-neutral-50 px-3.5 py-3">
            <div>
                <div className={cn("text-[12px]", MUTED)}>{label}</div>
                <div className="font-medium">{account}</div>
            </div>
            <span className={cn("shrink-0 whitespace-nowrap font-bold", className)}>{amount}</span>
        </div>
    );
}

// Day 6: the user types the rate their bank gave; the ECB rate is only a reference next to it
export function TransferMock() {
    const t = useTranslations("Landing");
    const locale = useLocale();
    const { amount, rate, ecbRate } = SAMPLE.transfer;

    return (
        <Card className={cn(LIFT, "p-[22px]")}>
            <div className="mb-3.5 text-[16px] font-bold">{t("mock.internalTransfer")}</div>
            <TransferSide
                label={t("mock.from")}
                account={`${t("sample.mainAccount")} · EUR`}
                amount={`− ${formatMoney(amount, "EUR", locale)}`}
            />
            <div className="flex justify-center py-1.5 text-orange-700">
                <ArrowDown className="size-[18px]" />
            </div>
            <TransferSide
                label={t("mock.to")}
                account={`${t("sample.czechAccount")} · CZK`}
                amount={`+ ${formatMoney(amount * rate, "CZK", locale)}`}
                className="text-green-700"
            />
            <div className="mt-3.5 flex items-end gap-4">
                <div className="min-w-0 flex-1">
                    <FieldLabel className="mt-0">{t("mock.bankRate")}</FieldLabel>
                    <Input readOnly defaultValue={formatRate(rate, "EUR", "CZK", locale)} />
                </div>
                <div className={cn("pb-1 text-right text-[12px]", MUTED)}>
                    {t("mock.ecbReference")}
                    <br />
                    {formatRate(ecbRate, "EUR", "CZK", locale)}
                </div>
            </div>
        </Card>
    );
}

// Day 14: past 75% the app's budget bar turns yellow (dashboard/_components/budget-progress.jsx)
export function BudgetMock() {
    const t = useTranslations("Landing.mock");
    const locale = useLocale();
    const { spent, limit } = SAMPLE.monthBudget;
    const used = (spent / limit) * 100;
    const usedText = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(used);

    return (
        <Card className={cn(LIFT, "p-[22px]")}>
            <div className="text-[16px] font-bold">{t("monthlyBudget")}</div>
            <div className={cn("mt-1 text-[13px]", MUTED)}>
                {t("budgetSpent", { spent: formatMoney(spent, "EUR", locale), budget: formatMoney(limit, "EUR", locale) })}
            </div>
            <Progress value={used} className="mt-[18px] h-2.5 bg-neutral-100" extraStyles="rounded-full bg-yellow-500" />
            <div className={cn("mt-2 text-right text-[12px]", MUTED)}>{t("budgetUsed", { percent: usedText })}</div>
        </Card>
    );
}

// Day 22
export function CsvImportMock() {
    const t = useTranslations("Landing");
    const locale = useLocale();
    const cell = "px-0 py-2";
    const head = cn("h-auto px-0 py-1.5 font-medium", MUTED);

    return (
        <Card className={cn(LIFT, "p-5")}>
            <div className="flex items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-dashed border-orange-300 bg-orange-50 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <File className="size-5 shrink-0 text-orange-700" />
                    <span className="truncate text-[14px] font-medium">{t("mock.csvFile")}</span>
                </div>
                <span className={cn("shrink-0 text-[12px]", MUTED)}>{t("mock.csvRows", { count: SAMPLE.csvImport.rowCount })}</span>
            </div>
            <Table className="mt-3 text-[13px]">
                <TableHeader>
                    <TableRow className="border-neutral-100 hover:bg-transparent">
                        <TableHead className={head}>{t("mock.date")}</TableHead>
                        <TableHead className={head}>{t("mock.description")}</TableHead>
                        <TableHead className={cn(head, "text-right")}>{t("mock.amount")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {SAMPLE.csvImport.rows.map(({ key, date, amount }) => (
                        <TableRow key={key} className="border-neutral-100 hover:bg-transparent">
                            <TableCell className={cell}>{shortDate(locale, date)}</TableCell>
                            <TableCell className={cell}>{t(`mock.${key}`)}</TableCell>
                            <TableCell className={cn(cell, "text-right", amount < 0 ? "text-red-700" : "text-green-700")}>
                                {amount < 0 ? "−" : "+"} {formatMoney(Math.abs(amount), "EUR", locale)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="mt-3 flex justify-end">
                <Button type="button">{t("mock.import")}</Button>
            </div>
        </Card>
    );
}

// Day 30
export function BreakdownMock() {
    const t = useTranslations("Landing");
    const locale = useLocale();
    const percent = new Intl.NumberFormat(locale, { style: "percent" });

    return (
        <Card className={cn(LIFT, "p-7")}>
            <div className="mb-[18px] flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-[17px] font-bold">{t("mock.expensesBreakdown")}</span>
                <span className={cn("text-[13px]", MUTED)}>{t("mock.breakdownPeriod", { account: t("sample.mainAccount") })}</span>
            </div>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-9">
                <Donut slices={SAMPLE.breakdown} size={170} />
                <div className="flex w-full flex-1 flex-col gap-1 text-[15px]">
                    {SAMPLE.breakdown.map(({ key, amount, percent: share, swatch }, index) => (
                        <div
                            key={key}
                            className={cn(
                                "flex items-center justify-between gap-3 py-2",
                                index < SAMPLE.breakdown.length - 1 && "border-b border-neutral-100"
                            )}
                        >
                            <span className="flex items-center gap-2">
                                <Swatch className={swatch} />
                                {t(`sample.categories.${key}`)}
                            </span>
                            <span className="font-semibold">
                                {formatMoney(amount, "EUR", locale)} · {percent.format(share / 100)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}
