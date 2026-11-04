"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Big from "big.js";
import { format, isValid, parseISO } from "date-fns";
import { Check, Pencil, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/currency";
import { categoryLabel } from "@/lib/system-categories";
import { IMPORT_MAX_DESCRIPTION, IMPORT_MAX_ROWS } from "@/lib/csv-import/limits";
import { cn } from "@/lib/utils";
import CategoryPicker from "./category-picker";
import { targetChoice } from "./choices";
import { formatRowDate, rowStatusText } from "./display";
import Notice from "./notice";
import RowDetails from "./row-details";

const PAGE_SIZE = 50;

const FILTERS = {
    all: () => true,
    duplicates: (row) => Boolean(row.duplicateOf),
    noCategory: (row) => row.importable && row.target.kind === "none",
    excluded: (row) => !row.checked,
};

// Rows that can be edited: the ones read from the file, unless a filter, the currency or step 3 left them out
const editable = (row) => row.importable || row.status === "invalidEdit";

function SummaryLine({ label, value, strong }) {
    return (
        <div className={cn("flex justify-between gap-4", strong && "border-t pt-1 font-semibold")}>
            <span>{label}</span>
            <span className="tabular-nums">{value}</span>
        </div>
    );
}

// The date, description, type and amount of a row, as inputs. Changes apply as you type
function RowEditor({ row, edit, onEdit, onDone, onReset }) {
    const t = useTranslations("CsvImport");
    const today = format(new Date(), "yyyy-MM-dd");
    const amountText = edit?.amount ?? row.amount;

    return (
        <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-[9.5rem_1fr]">
                <Input
                    type="date"
                    aria-label={t("table.date")}
                    className="bg-background"
                    max={today}
                    value={format(row.date, "yyyy-MM-dd")}
                    onChange={(event) => {
                        // parseISO reads "YYYY-MM-DD" as local midnight, as the forms save dates
                        const date = parseISO(event.target.value);
                        if (isValid(date) && event.target.value <= today) onEdit({ date });
                    }}
                />
                <Input
                    aria-label={t("table.description")}
                    className="bg-background"
                    maxLength={IMPORT_MAX_DESCRIPTION}
                    value={edit?.description ?? row.description}
                    onChange={(event) => onEdit({ description: event.target.value })}
                />
            </div>
            <div className="grid gap-2 sm:grid-cols-[9.5rem_1fr]">
                <Select value={row.type} onValueChange={(type) => onEdit({ type })}>
                    <SelectTrigger className="w-full bg-background" aria-label={t("editType")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="EXPENSE">{t("types.EXPENSE")}</SelectItem>
                        <SelectItem value="INCOME">{t("types.INCOME")}</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    inputMode="decimal"
                    aria-label={t("table.amount")}
                    aria-invalid={row.status === "invalidEdit"}
                    className="bg-background text-right tabular-nums"
                    value={amountText}
                    onChange={(event) => onEdit({ amount: event.target.value })}
                />
            </div>
            {row.status === "invalidEdit" && <p className="text-xs text-red-500">{t("status.invalidEdit")}</p>}
            <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={onDone}>
                    <Check className="h-4 w-4" />
                    {t("doneEditing")}
                </Button>
                {edit && (
                    <Button type="button" size="sm" variant="ghost" onClick={onReset}>
                        <Undo2 className="h-4 w-4" />
                        {t("resetRow")}
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function StepPreview({ result, account, categories, columns, rowEdits, onTick, onTickMany, onRowChoice, onRowEdit, onRowReset, onCategoryCreated, onSubcategoryCreated, saveError }) {
    const t = useTranslations("CsvImport");
    const tCategories = useTranslations("SystemCategories");
    const locale = useLocale();
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(0);
    const [editing, setEditing] = useState(null);
    // Rows whose whole file row is shown under their description
    const [expanded, setExpanded] = useState(() => new Set());
    const toggleDetails = (index) => setExpanded((current) => {
        const next = new Set(current);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
    });
    const { rows, summary } = result;
    const money = (amount) => formatMoney(amount.toString(), account.currency, locale);

    const filtered = rows.filter(FILTERS[filter]);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pages - 1);
    const shown = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
    const selectable = filtered.filter((row) => row.importable);
    const allTicked = selectable.length > 0 && selectable.every((row) => row.checked);
    const someTicked = selectable.some((row) => row.checked);

    const tabCounts = Object.fromEntries(Object.entries(FILTERS).map(([id, matches]) => [id, rows.filter(matches).length]));
    const show = (next) => {
        setFilter(next);
        setPage(0);
    };

    const balanceAfter = new Big(account.balance).plus(summary.net);
    const leftOut = [
        ["filtered", summary.filtered],
        ["otherCurrency", summary.otherCurrency],
        ["unreadable", summary.unreadable],
        ["zero", summary.zero],
        ["skipped", summary.skipped],
        ["duplicatesLeftOut", summary.duplicatesLeftOut],
        ["unticked", summary.unticked],
    ].filter(([, count]) => count > 0);

    return (
        <div className="space-y-6">
            {summary.duplicates > 0 && (
                <Notice
                    variant="warning"
                    className="border-2"
                    action={filter !== "duplicates" && (
                        <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => show("duplicates")}>{t("reviewDuplicates")}</Button>
                    )}
                >
                    <p className="font-semibold">{t("duplicatesTitle", { count: summary.duplicates })}</p>
                    <p>
                        {summary.duplicatesLeftOut > 0
                            ? t("duplicatesLeftOut", { count: summary.duplicatesLeftOut, account: account.name })
                            : t("duplicatesIncluded", { count: summary.duplicates })}
                    </p>
                </Notice>
            )}
            {summary.noCategory > 0 && (
                <Notice
                    variant="info"
                    action={filter !== "noCategory" && (
                        <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => show("noCategory")}>{t("showThem")}</Button>
                    )}
                >
                    {t("noCategoryNotice", { count: summary.noCategory })}
                </Notice>
            )}
            {summary.toImport > IMPORT_MAX_ROWS && (
                <Notice variant="error">{t("tooManyRows", { count: summary.toImport, max: IMPORT_MAX_ROWS })}</Notice>
            )}
            <p className="text-sm text-muted-foreground">{t("editHint")}</p>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 rounded-lg border p-4 text-sm">
                    <SummaryLine label={t("summary.rows")} value={summary.total} />
                    {leftOut.map(([id, count]) => (
                        <SummaryLine key={id} label={t(`summary.${id}`)} value={`−${count}`} />
                    ))}
                    <SummaryLine label={t("summary.toImport")} value={summary.toImport} strong />
                    {summary.edited > 0 && <p className="pt-1 text-xs text-muted-foreground">{t("summary.edited", { count: summary.edited })}</p>}
                </div>
                <div className="space-y-1 rounded-lg border p-4 text-sm">
                    <SummaryLine label={t("summary.income")} value={money(summary.income)} />
                    <SummaryLine label={t("summary.expenses")} value={money(summary.expenses.neg())} />
                    <SummaryLine label={t("summary.net")} value={money(summary.net)} strong />
                    <p className="pt-2 text-muted-foreground">
                        {t("summary.balance", { account: account.name, before: money(new Big(account.balance)), after: money(balanceAfter) })}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2" role="tablist">
                {Object.keys(FILTERS).map((id) => (
                    <Button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={filter === id}
                        size="sm"
                        variant={filter === id ? "default" : "outline"}
                        className={cn(id === "duplicates" && tabCounts.duplicates > 0 && filter !== id && "border-amber-400 text-amber-800")}
                        onClick={() => show(id)}
                    >
                        {t(`filters.${id}`, { count: tabCounts[id] })}
                    </Button>
                ))}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <Checkbox
                                    aria-label={t("tickAll")}
                                    disabled={selectable.length === 0}
                                    checked={allTicked ? true : someTicked ? "indeterminate" : false}
                                    onCheckedChange={() => onTickMany(selectable.map((row) => row.index), !allTicked)}
                                />
                            </TableHead>
                            <TableHead>{t("table.date")}</TableHead>
                            <TableHead>{t("table.description")}</TableHead>
                            <TableHead className="text-right">{t("table.amount")}</TableHead>
                            <TableHead>{t("table.category")}</TableHead>
                            <TableHead>{t("table.status")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shown.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">{t("noRowsInFilter")}</TableCell>
                            </TableRow>
                        )}
                        {shown.map((row) => {
                            const isEditing = editing === row.index && editable(row);
                            return (
                                <TableRow
                                    key={row.index}
                                    className={cn(
                                        row.duplicateOf && "bg-amber-50 hover:bg-amber-100",
                                        !editable(row) && "text-muted-foreground",
                                        row.importable && !row.checked && "opacity-70"
                                    )}
                                >
                                    <TableCell className="align-top">
                                        <Checkbox
                                            aria-label={t("tickRow", { number: row.rowNumber })}
                                            disabled={!row.importable}
                                            checked={row.checked}
                                            onCheckedChange={(checked) => onTick(row.index, checked === true)}
                                        />
                                    </TableCell>
                                    {isEditing ? (
                                        <TableCell colSpan={3} className="min-w-72 align-top whitespace-normal">
                                            <RowEditor
                                                row={row}
                                                edit={rowEdits[row.index]}
                                                onEdit={(patch) => onRowEdit(row.index, patch)}
                                                onDone={() => setEditing(null)}
                                                onReset={() => onRowReset(row.index)}
                                            />
                                        </TableCell>
                                    ) : (
                                        <>
                                            <TableCell className="whitespace-nowrap align-top">{formatRowDate(row.date, locale)}</TableCell>
                                            <TableCell className="max-w-72 align-top whitespace-normal">
                                                <span className="break-words">{row.description || "—"}</span>
                                                {row.duplicateOf && (
                                                    <span className="mt-1 block text-xs text-amber-800">
                                                        {t("duplicateOf", {
                                                            date: formatRowDate(new Date(row.duplicateOf.date), locale),
                                                            description: row.duplicateOf.description || "—",
                                                            category: categoryLabel(row.duplicateOf.category, tCategories),
                                                            amount: formatMoney(row.duplicateOf.amount, account.currency, locale),
                                                        })}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    className="mt-1 block text-xs text-muted-foreground underline-offset-2 hover:underline"
                                                    onClick={() => toggleDetails(row.index)}
                                                    aria-expanded={expanded.has(row.index)}
                                                >
                                                    {expanded.has(row.index) ? t("hideWholeRow") : t("showWholeRow")}
                                                </button>
                                                {expanded.has(row.index) && (
                                                    <div className="mt-1">
                                                        <RowDetails cells={row.cells} columns={columns} />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className="whitespace-nowrap text-right align-top tabular-nums"
                                                style={row.importable ? { color: row.type === "EXPENSE" ? "red" : "green" } : undefined}
                                            >
                                                {row.signedAmount ? formatMoney(row.signedAmount, account.currency, locale) : row.raw}
                                                {editable(row) && (
                                                    <Button
                                                        type="button"
                                                        size="icon-sm"
                                                        variant="ghost"
                                                        className="ml-1 text-muted-foreground"
                                                        aria-label={t("editRow", { number: row.rowNumber })}
                                                        onClick={() => setEditing(row.index)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell className="align-top">
                                        {row.importable ? (
                                            <CategoryPicker
                                                type={row.type}
                                                choice={targetChoice(row.target)}
                                                onChange={(choice) => onRowChoice(row.index, choice)}
                                                categories={categories}
                                                onCategoryCreated={onCategoryCreated}
                                                onSubcategoryCreated={onSubcategoryCreated}
                                                size="sm"
                                            />
                                        ) : "—"}
                                    </TableCell>
                                    <TableCell className="align-top whitespace-normal text-xs">
                                        {row.importable ? (
                                            <div className="flex flex-wrap gap-1">
                                                {row.duplicateOf && (
                                                    <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-800">{t("badges.duplicate")}</Badge>
                                                )}
                                                {row.target.kind === "none" && (
                                                    <Badge variant="outline" className="border-amber-300 text-amber-700">{t("badges.noCategory")}</Badge>
                                                )}
                                                {row.edited && <Badge variant="outline" className="border-sky-300 text-sky-700">{t("badges.edited")}</Badge>}
                                            </div>
                                        ) : (
                                            <span className={cn((row.status === "unreadable" || row.status === "invalidEdit") && "text-red-600")}>
                                                {rowStatusText(row, columns, t)}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {pages > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm">
                    <Button type="button" size="sm" variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t("previousPage")}</Button>
                    <span className="tabular-nums">{t("pageOf", { page: currentPage + 1, pages })}</span>
                    <Button type="button" size="sm" variant="outline" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)}>{t("nextPage")}</Button>
                </div>
            )}

            {saveError && <Notice variant="error">{saveError}</Notice>}
        </div>
    );
}
