"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { categoryLabel } from "@/lib/system-categories";
import { cn } from "@/lib/utils";
import CategoryPicker from "./category-picker";
import { NO_CHOICE, otherCategoryOf } from "./choices";
import { columnLabel, formatRowDate } from "./display";
import Notice from "./notice";

// How many of a group's rows its "show rows" list displays
const GROUP_ROWS_SHOWN = 20;

function GroupCard({ group, choice, onChoice, rows, categories, currency, onCategoryCreated, onSubcategoryCreated }) {
    const t = useTranslations("CsvImport");
    const tCategories = useTranslations("SystemCategories");
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const sign = group.type === "EXPENSE" ? "-" : "";
    const firstRow = rows[group.rows[0]];

    return (
        <div className={cn("space-y-3 rounded-lg border p-3", choice.value === "none" && "border-amber-300")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                {group.alone ? (
                    <span className="min-w-0 flex-1">
                        <span className="block break-words font-medium">{group.label || t("emptyGroup")}</span>
                        <span className="block text-xs text-muted-foreground">{t("aloneMeta", { number: firstRow.rowNumber, date: formatRowDate(firstRow.date, locale) })}</span>
                    </span>
                ) : (
                    <button type="button" className="flex min-w-0 flex-1 items-start gap-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
                        {open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />}
                        <span className="min-w-0">
                            <span className="block break-words font-medium">{group.label || t("emptyGroup")}</span>
                            <span className="block text-xs text-muted-foreground">
                                {t("groupMeta", { count: group.count, similar: group.variants - 1 })}
                            </span>
                        </span>
                    </button>
                )}
                <span className="font-medium tabular-nums" style={{ color: group.type === "EXPENSE" ? "red" : "green" }}>
                    {formatMoney(`${sign}${group.total}`, currency, locale)}
                </span>
            </div>

            <CategoryPicker
                type={group.type}
                choice={choice}
                onChange={onChoice}
                categories={categories}
                onCategoryCreated={onCategoryCreated}
                onSubcategoryCreated={onSubcategoryCreated}
                allowSkip
            />

            {choice.value === "none" && (
                <p className="text-xs text-amber-700">{t("goesToOther", { category: categoryLabel(otherCategoryOf(categories, group.type), tCategories) })}</p>
            )}
            {choice.value === "skip" && <p className="text-xs text-muted-foreground">{t("skipExplained")}</p>}

            {open && (
                <ul className="space-y-1 border-t pt-2 text-sm">
                    {group.rows.slice(0, GROUP_ROWS_SHOWN).map((index) => {
                        const row = rows[index];
                        return (
                            <li key={index} className="flex justify-between gap-3">
                                <span className="min-w-0 truncate">
                                    <span className="text-muted-foreground">{formatRowDate(row.date, locale)}</span> · {row.description}
                                </span>
                                <span className="whitespace-nowrap tabular-nums">{formatMoney(row.signedAmount, currency, locale)}</span>
                            </li>
                        );
                    })}
                    {group.rows.length > GROUP_ROWS_SHOWN && (
                        <li className="text-xs text-muted-foreground">{t("moreRows", { count: group.rows.length - GROUP_ROWS_SHOWN })}</li>
                    )}
                </ul>
            )}
        </div>
    );
}

export default function StepCategories({ groups, rows, choices, onChoice, categories, account, columns, mapping, onCategoryCreated, onSubcategoryCreated }) {
    const t = useTranslations("CsvImport");
    const withoutCategory = groups.filter((group) => (choices[group.id] ?? NO_CHOICE).value === "none").length;
    const column = mapping.groupBy === null ? null : columnLabel(columns, mapping.groupBy, t);

    const sections = [
        { id: "expenses", title: (count) => t("expenseGroups", { count }), groups: groups.filter((group) => !group.alone && group.type === "EXPENSE") },
        { id: "income", title: (count) => t("incomeGroups", { count }), groups: groups.filter((group) => !group.alone && group.type === "INCOME") },
        // Rows with nothing in the Group by column, each on its own
        { id: "alone", title: (count) => t("aloneGroups", { count, column }), groups: groups.filter((group) => group.alone), hint: t("aloneHint") },
    ];

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">{column === null ? t("notGrouped") : t("groupedBy", { column })}</p>

            {withoutCategory > 0 && <Notice variant="warning">{t("groupsWithoutCategory", { count: withoutCategory })}</Notice>}

            {sections.map((section) => section.groups.length > 0 && (
                <section key={section.id} className="space-y-3">
                    <div>
                        <h3 className="font-semibold">{section.title(section.groups.length)}</h3>
                        {section.hint && <p className="text-xs text-muted-foreground">{section.hint}</p>}
                    </div>
                    {section.groups.map((group) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            choice={choices[group.id] ?? NO_CHOICE}
                            onChoice={(choice) => onChoice(group.id, choice)}
                            rows={rows}
                            categories={categories}
                            currency={account.currency}
                            onCategoryCreated={onCategoryCreated}
                            onSubcategoryCreated={onSubcategoryCreated}
                        />
                    ))}
                </section>
            ))}
        </div>
    );
}
