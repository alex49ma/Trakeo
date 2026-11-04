"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/currency";
import { ENCODINGS } from "@/lib/csv-import/decode";
import { DATE_FORMATS } from "@/lib/csv-import/parse";
import { HEADER_SEARCH_ROWS } from "@/lib/csv-import/table";
import { IMPORT_MAX_ROWS } from "@/lib/csv-import/limits";
import { cn } from "@/lib/utils";
import { columnLabel, formatRowDate, rowStatusText } from "./display";
import Notice from "./notice";

const NONE = "none";
const RAW_PREVIEW_ROWS = 10;
const PARSED_PREVIEW_ROWS = 8;
const MAX_DESCRIPTION_COLUMNS = 3;
const MAX_FILTERS = 2;
// A filter lists the column's values as checkboxes, so a column with more values than this can't be a filter
const MAX_FILTER_VALUES = 30;

const DELIMITER_OPTIONS = [
    { id: "comma", value: "," },
    { id: "semicolon", value: ";" },
    { id: "tab", value: "\t" },
    { id: "pipe", value: "|" },
];
const delimiterId = (value) => DELIMITER_OPTIONS.find((option) => option.value === value)?.id;

const dateFormatLabel = (id) => DATE_FORMATS.find((format) => format.id === id)?.label ?? id;

function Field({ label, hint, children }) {
    return (
        <div className="grid gap-2 md:grid-cols-[11rem_1fr] md:items-start">
            <div className="text-sm font-medium md:pt-2">{label}</div>
            <div className="min-w-0 space-y-2">
                {children}
                {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
        </div>
    );
}

// A select of the file's columns. Optional ones offer "No column"; required ones show a placeholder until chosen
function ColumnSelect({ columns, value, onChange, optional = false }) {
    const t = useTranslations("CsvImport");
    const selected = value === null || value === undefined ? (optional ? NONE : "") : String(value);
    return (
        <Select value={selected} onValueChange={(next) => onChange(next === NONE ? null : Number(next))}>
            <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder={t("chooseColumn")} />
            </SelectTrigger>
            <SelectContent>
                {optional && <SelectItem value={NONE}>{t("noColumn")}</SelectItem>}
                {columns.map((_, index) => (
                    <SelectItem key={index} value={String(index)}>{columnLabel(columns, index, t)}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function OptionSelect({ label, value, onChange, children }) {
    return (
        <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <Select value={String(value)} onValueChange={onChange}>
                <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>{children}</SelectContent>
            </Select>
        </div>
    );
}

function RawPreview({ table }) {
    const t = useTranslations("CsvImport");
    const shown = table.rows.slice(0, Math.max(RAW_PREVIEW_ROWS, table.headerIndex + 3));
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("rawPreview")}</p>
            <div className="max-h-64 overflow-auto rounded-md border bg-muted/30">
                <table className="w-full text-xs">
                    <tbody>
                        {shown.map((cells, index) => (
                            <tr key={index} className={cn("border-b last:border-0", index === table.headerIndex && "bg-orange-100 font-semibold")}>
                                <td className="sticky left-0 bg-inherit px-2 py-1 text-right text-muted-foreground tabular-nums">{index + 1}</td>
                                {cells.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="max-w-48 truncate whitespace-nowrap px-2 py-1" title={cell}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const distinctValues = (dataRows, column) =>
    column === null ? [] : [...new Set(dataRows.map((row) => String(row[column] ?? "").trim()))].sort();

function FilterEditor({ filter, columns, dataRows, onChange, onRemove }) {
    const t = useTranslations("CsvImport");
    const values = useMemo(() => distinctValues(dataRows, filter.column), [filter.column, dataRows]);
    const selected = new Set(filter.values);

    return (
        <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    {/* A new filter column starts with every value ticked, so it doesn't leave every row out */}
                    <ColumnSelect columns={columns} value={filter.column} onChange={(column) => onChange({ column, values: distinctValues(dataRows, column) })} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={t("removeFilter")}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            {filter.column !== null && values.length > MAX_FILTER_VALUES && (
                <p className="text-xs text-red-500">{t("tooManyFilterValues", { count: values.length })}</p>
            )}
            {filter.column !== null && values.length <= MAX_FILTER_VALUES && (
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {values.map((value) => (
                        <label key={value} className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={selected.has(value)}
                                onCheckedChange={(checked) => onChange({
                                    ...filter,
                                    values: checked ? [...filter.values, value] : filter.values.filter((existing) => existing !== value),
                                })}
                            />
                            {value || <span className="italic text-muted-foreground">{t("emptyValue")}</span>}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function StepColumns({ table, decoded, options, onOptions, mapping, onMapping, formats, rows, account, onChooseAccount }) {
    const t = useTranslations("CsvImport");
    const locale = useLocale();
    const { columns, dataRows } = table;

    const counts = useMemo(() => {
        const byStatus = {};
        for (const row of rows) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
        return byStatus;
    }, [rows]);
    const ready = counts.ready ?? 0;
    const allInOtherCurrency = (counts.otherCurrency ?? 0) > 0 && ready === 0;
    const otherCurrencies = [...new Set(rows.filter((row) => row.status === "otherCurrency").map((row) => row.reason))].join(", ");

    const firstDate = mapping.date === null ? null : dataRows.map((row) => String(row[mapping.date] ?? "").trim()).find(Boolean);
    const firstReadDate = rows.find((row) => row.date)?.date;
    const descriptionColumns = mapping.description.length > 0 ? mapping.description : [null];

    // Empty slots (null) stay until removed, so an added select doesn't vanish. Rows skip them
    const setDescription = (index, column) => {
        const next = [...descriptionColumns];
        next[index] = column;
        onMapping({ description: next });
    };

    const amountSigned = mapping.amountLayout === "signed";

    return (
        <div className="space-y-8">
            <RawPreview table={table} />

            <div className="grid gap-4 sm:grid-cols-3">
                <OptionSelect label={t("encoding")} value={options.encoding} onChange={(encoding) => onOptions({ encoding })}>
                    <SelectItem value="auto">{t("autoValue", { value: t(`encodings.${decoded.encoding}`) })}</SelectItem>
                    {ENCODINGS.map((encoding) => <SelectItem key={encoding} value={encoding}>{t(`encodings.${encoding}`)}</SelectItem>)}
                </OptionSelect>
                <OptionSelect
                    label={t("delimiter")}
                    value={options.delimiter === "auto" ? "auto" : delimiterId(options.delimiter)}
                    onChange={(id) => onOptions({ delimiter: id === "auto" ? "auto" : DELIMITER_OPTIONS.find((option) => option.id === id).value })}
                >
                    <SelectItem value="auto">{t("autoValue", { value: t(`delimiters.${delimiterId(table.delimiter)}`) })}</SelectItem>
                    {DELIMITER_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{t(`delimiters.${option.id}`)}</SelectItem>)}
                </OptionSelect>
                <OptionSelect label={t("headerRow")} value={options.headerRow} onChange={(headerRow) => onOptions({ headerRow: headerRow === "auto" ? "auto" : Number(headerRow) })}>
                    <SelectItem value="auto">{t("autoValue", { value: t("rowNumber", { number: table.headerIndex + 1 }) })}</SelectItem>
                    {table.rows.slice(0, HEADER_SEARCH_ROWS).map((_, index) => (
                        <SelectItem key={index} value={String(index)}>{t("rowNumber", { number: index + 1 })}</SelectItem>
                    ))}
                </OptionSelect>
            </div>
            <p className="-mt-6 text-xs text-muted-foreground">{t("encodingHint")}</p>

            <div className="space-y-5">
                <Field label={t("fields.date")}>
                    <ColumnSelect columns={columns} value={mapping.date} onChange={(date) => onMapping({ date })} />
                    {mapping.date !== null && (
                        <Select value={mapping.dateFormat} onValueChange={(dateFormat) => onMapping({ dateFormat })}>
                            <SelectTrigger className="w-full bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">
                                    {formats.detectedDateFormat ? t("autoValue", { value: dateFormatLabel(formats.detectedDateFormat) }) : t("autoNothing")}
                                </SelectItem>
                                {DATE_FORMATS.map((format) => <SelectItem key={format.id} value={format.id}>{format.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                    {mapping.date !== null && !formats.dateFormat && <p className="text-xs text-red-500">{t("dateUnreadable")}</p>}
                    {firstDate && firstReadDate && (
                        <p className="text-xs text-muted-foreground">{t("dateExample", { value: firstDate, date: formatRowDate(firstReadDate, locale) })}</p>
                    )}
                    {formats.dateAmbiguous && <p className="text-xs text-amber-700">{t("dateAmbiguous")}</p>}
                </Field>

                <Field label={t("fields.amount")}>
                    <Select value={mapping.amountLayout} onValueChange={(amountLayout) => onMapping({ amountLayout })}>
                        <SelectTrigger className="w-full bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="signed">{t("amountLayouts.signed")}</SelectItem>
                            <SelectItem value="split">{t("amountLayouts.split")}</SelectItem>
                        </SelectContent>
                    </Select>
                    {amountSigned ? (
                        <ColumnSelect columns={columns} value={mapping.amount} onChange={(amount) => onMapping({ amount })} />
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">{t("moneyIn")}</span>
                                <ColumnSelect columns={columns} value={mapping.moneyIn} onChange={(moneyIn) => onMapping({ moneyIn })} />
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">{t("moneyOut")}</span>
                                <ColumnSelect columns={columns} value={mapping.moneyOut} onChange={(moneyOut) => onMapping({ moneyOut })} />
                            </div>
                        </div>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2 sm:items-center">
                        <Select value={mapping.decimal} onValueChange={(decimal) => onMapping({ decimal })}>
                            <SelectTrigger className="w-full bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">{t("decimalAuto", { value: t(`decimals.${formats.detectedDecimal === "," ? "comma" : "dot"}`) })}</SelectItem>
                                <SelectItem value=".">{t("decimalNamed", { value: t("decimals.dot") })}</SelectItem>
                                <SelectItem value=",">{t("decimalNamed", { value: t("decimals.comma") })}</SelectItem>
                            </SelectContent>
                        </Select>
                        <label className="flex items-center gap-2 text-sm">
                            <Switch checked={mapping.invert} onCheckedChange={(invert) => onMapping({ invert })} />
                            {t("invert")}
                        </label>
                    </div>
                    {formats.decimalAmbiguous && <p className="text-xs text-amber-700">{t("decimalAmbiguous")}</p>}
                </Field>

                <Field label={t("fields.fee")} hint={t("feeHint")}>
                    <ColumnSelect columns={columns} value={mapping.fee} optional onChange={(fee) => onMapping({ fee })} />
                </Field>

                <Field label={t("fields.description")} hint={t("descriptionHint")}>
                    {descriptionColumns.map((column, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="flex-1">
                                <ColumnSelect columns={columns} value={column} optional onChange={(next) => setDescription(index, next)} />
                            </div>
                            {descriptionColumns.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t("removeColumn")}
                                    onClick={() => onMapping({ description: mapping.description.filter((_, position) => position !== index) })}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {mapping.description.length > 0 && mapping.description.length < MAX_DESCRIPTION_COLUMNS && (
                        <Button type="button" variant="outline" size="sm" onClick={() => onMapping({ description: [...mapping.description, null] })}>
                            <Plus className="h-4 w-4" />
                            {t("addColumn")}
                        </Button>
                    )}
                </Field>

                <Field label={t("fields.groupBy")} hint={t("groupByHint")}>
                    <ColumnSelect columns={columns} value={mapping.groupBy} optional onChange={(groupBy) => onMapping({ groupBy })} />
                </Field>

                <Field
                    label={t("fields.currency")}
                    hint={mapping.currency === null ? t("noCurrencyColumn", { currency: account.currency }) : t("currencyHint", { currency: account.currency })}
                >
                    <ColumnSelect columns={columns} value={mapping.currency} optional onChange={(currency) => onMapping({ currency })} />
                </Field>

                <Field label={t("fields.filters")} hint={t("filtersHint")}>
                    {mapping.filters.map((filter, index) => (
                        <FilterEditor
                            key={index}
                            filter={filter}
                            columns={columns}
                            dataRows={dataRows}
                            onChange={(next) => onMapping({ filters: mapping.filters.map((existing, position) => (position === index ? next : existing)) })}
                            onRemove={() => onMapping({ filters: mapping.filters.filter((_, position) => position !== index) })}
                        />
                    ))}
                    {mapping.filters.length < MAX_FILTERS && (
                        <Button type="button" variant="outline" size="sm" onClick={() => onMapping({ filters: [...mapping.filters, { column: null, values: [] }] })}>
                            <Plus className="h-4 w-4" />
                            {t("addFilter")}
                        </Button>
                    )}
                </Field>
            </div>

            <div className="space-y-3">
                <p className="text-sm font-medium">{t("parsedPreview")}</p>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">{t("table.row")}</TableHead>
                                <TableHead>{t("table.date")}</TableHead>
                                <TableHead>{t("table.description")}</TableHead>
                                <TableHead className="text-right">{t("table.amount")}</TableHead>
                                <TableHead>{t("table.status")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.slice(0, PARSED_PREVIEW_ROWS).map((row) => (
                                <TableRow key={row.index} className={cn(row.status !== "ready" && "text-muted-foreground")}>
                                    <TableCell className="tabular-nums">{row.rowNumber}</TableCell>
                                    <TableCell className="whitespace-nowrap">{formatRowDate(row.date, locale)}</TableCell>
                                    <TableCell className="max-w-64 truncate" title={row.description}>{row.description}</TableCell>
                                    <TableCell
                                        className="whitespace-nowrap text-right tabular-nums"
                                        style={row.status === "ready" ? { color: row.type === "EXPENSE" ? "red" : "green" } : undefined}
                                    >
                                        {row.signedAmount ? formatMoney(row.signedAmount, account.currency, locale) : ""}
                                    </TableCell>
                                    <TableCell className={cn("text-xs", row.status === "unreadable" && "text-red-600")}>
                                        {row.status === "ready" ? t(`types.${row.type}`) : rowStatusText(row, columns, t)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <p className="text-sm text-muted-foreground">
                    {t("readCounts", {
                        ready,
                        unreadable: counts.unreadable ?? 0,
                        left: (counts.filtered ?? 0) + (counts.otherCurrency ?? 0) + (counts.zero ?? 0),
                    })}
                </p>

                {allInOtherCurrency && (
                    <Notice
                        variant="error"
                        action={<Button type="button" size="sm" variant="outline" onClick={onChooseAccount}>{t("chooseAnotherAccount")}</Button>}
                    >
                        {t("allOtherCurrency", { currencies: otherCurrencies, account: account.name, currency: account.currency })}
                    </Notice>
                )}
                {ready > IMPORT_MAX_ROWS && <Notice variant="warning">{t("tooManyReadyRows", { count: ready, max: IMPORT_MAX_ROWS })}</Notice>}
            </div>
        </div>
    );
}
