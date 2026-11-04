"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currencyDecimals } from "@/lib/currency";
import { decodeBytes } from "@/lib/csv-import/decode";
import { readTable } from "@/lib/csv-import/table";
import { guessMapping } from "@/lib/csv-import/guess";
import { buildGroups, buildRows, resolveFormats } from "@/lib/csv-import/rows";
import { IMPORT_MAX_ROWS } from "@/lib/csv-import/limits";
import { getImportContext, importTransactions } from "@/actions/import";
import { cn } from "@/lib/utils";
import { buildPayload, resolveImport } from "./choices";
import StepFile from "./step-file";
import StepColumns from "./step-columns";
import StepCategories from "./step-categories";
import StepPreview from "./step-preview";

const STEPS = ["file", "columns", "categories", "preview"];
const DEFAULT_OPTIONS = { encoding: "auto", delimiter: "auto", headerRow: "auto" };

/*
 * The CSV import: file and account, columns, categories, preview. Everything stays in this component's state, and
 * nothing is saved until "Import" in the preview. What the steps show is derived from the file and the choices.
 */
export default function ImportWizard({ accounts, categories, initialAccountId }) {
    const t = useTranslations("CsvImport");
    const locale = useLocale();
    const router = useRouter();

    const [step, setStep] = useState(0);
    const [accountId, setAccountId] = useState(initialAccountId);
    const [file, setFile] = useState(null);
    const [options, setOptions] = useState(DEFAULT_OPTIONS);
    // The user's changes to the guessed mapping, valid only while the columns stay the same
    const [edited, setEdited] = useState(null);
    // The user's categories, plus the ones created in the drawers during the import
    const [categoryList, setCategoryList] = useState(categories);
    const [choices, setChoices] = useState({});
    const [rowChoices, setRowChoices] = useState({});
    const [rowEdits, setRowEdits] = useState({});
    const [ticks, setTicks] = useState({});
    // The account's existing transactions around the file's dates, for the possible-duplicate check
    const [context, setContext] = useState(null);
    const [loadingContext, setLoadingContext] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const account = accounts.find((candidate) => candidate.id === accountId);
    const currency = account?.currency;
    const decimals = currency ? currencyDecimals(currency) : 2;

    const decoded = useMemo(() => (file ? decodeBytes(file.buffer, options.encoding, locale) : null), [file, options.encoding, locale]);
    const table = useMemo(
        () => (decoded ? readTable(decoded.text, { delimiter: options.delimiter, headerRow: options.headerRow }) : null),
        [decoded, options.delimiter, options.headerRow]
    );
    const signature = table ? `${table.delimiter}|${table.headerIndex}|${table.columns.join("\u0001")}` : null;
    const guessed = useMemo(() => (table ? guessMapping(table.columns, table.dataRows) : null), [table]);
    const mapping = edited && edited.signature === signature ? edited.mapping : guessed;

    const formats = useMemo(() => (table && mapping ? resolveFormats(table.dataRows, mapping, locale) : null), [table, mapping, locale]);
    const rows = useMemo(
        () => (table && mapping && formats && currency ? buildRows(table, mapping, formats, currency, decimals) : []),
        [table, mapping, formats, currency, decimals]
    );
    const groups = useMemo(() => buildGroups(rows, decimals), [rows, decimals]);

    const dateRange = useMemo(() => {
        const dates = rows.filter((row) => row.status === "ready").map((row) => row.date.getTime());
        return dates.length > 0 ? { from: new Date(Math.min(...dates)), to: new Date(Math.max(...dates)) } : null;
    }, [rows]);
    const contextKey = dateRange ? `${accountId}|${dateRange.from.getTime()}|${dateRange.to.getTime()}` : null;
    const existing = context && context.key === contextKey ? context.existing : null;

    const result = useMemo(
        () => resolveImport({ rows, choices, rowChoices, rowEdits, ticks, existing, categories: categoryList, decimals }),
        [rows, choices, rowChoices, rowEdits, ticks, existing, categoryList, decimals]
    );

    const addCategory = (category) => setCategoryList((list) => [...list, { ...category, subCategories: [] }]);
    const addSubcategory = (subcategory) => setCategoryList((list) => list.map((category) => (
        category.id === subcategory.category_id
            ? { ...category, subCategories: [...(category.subCategories ?? []), subcategory] }
            : category
    )));
    const editRow = (index, patch) => setRowEdits((edits) => ({ ...edits, [index]: { ...edits[index], ...patch } }));
    const resetRow = (index) => setRowEdits((edits) => {
        const next = { ...edits };
        delete next[index];
        return next;
    });

    // Reloading or closing the tab would lose the work
    useEffect(() => {
        if (!file || saved) return undefined;
        const warn = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [file, saved]);

    const readyCount = groups.reduce((total, group) => total + group.count, 0);
    const canEnter = [
        true,
        Boolean(account && table && table.dataRows.length > 0),
        Boolean(account && table && readyCount > 0),
        Boolean(account && table && readyCount > 0),
    ];

    const handleFile = (loaded) => {
        setFile(loaded);
        setOptions(DEFAULT_OPTIONS);
        setEdited(null);
        setChoices({});
        setRowChoices({});
        setRowEdits({});
        setTicks({});
        setContext(null);
        setSaveError(null);
    };

    const handleAccount = (id) => {
        setAccountId(id);
        // Another account has other possible duplicates
        setTicks({});
        setSaveError(null);
    };

    const goToPreview = async () => {
        if (context?.key !== contextKey) {
            setLoadingContext(true);
            try {
                const response = await getImportContext({ accountId, from: dateRange.from, to: dateRange.to });
                if (!response.success) {
                    toast.error(t(`errors.${response.error}`));
                    return;
                }
                setContext({ key: contextKey, existing: response.existing });
                setTicks({});
            } catch {
                toast.error(t("errors.unexpected"));
                return;
            } finally {
                setLoadingContext(false);
            }
        }
        setStep(3);
    };

    const handleImport = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            const response = await importTransactions(buildPayload(result, accountId, categoryList));
            if (!response.success) {
                setSaveError(t(`errors.${response.error}`));
                return;
            }
            setSaved(true);
            toast.success(t("success", { count: response.created }));
            router.push(`/account/${accountId}`);
        } catch {
            setSaveError(t("errors.unexpected"));
        } finally {
            setSaving(false);
        }
    };

    const next = () => (step === 2 ? goToPreview() : setStep(step + 1));
    const importBlocked = saving || saved || result.summary.toImport === 0 || result.summary.toImport > IMPORT_MAX_ROWS;

    return (
        <Card className="bg-card">
            <CardHeader className="space-y-4">
                <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {STEPS.map((id, index) => (
                        <li key={id}>
                            <button
                                type="button"
                                disabled={index >= step}
                                onClick={() => setStep(index)}
                                aria-current={index === step ? "step" : undefined}
                                className={cn(
                                    "flex items-center gap-2",
                                    index === step ? "font-semibold" : "text-muted-foreground",
                                    index < step && "hover:text-foreground"
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                                        index === step && "border-orange-400 bg-orange-100",
                                        index < step && "border-green-500 bg-green-50 text-green-700"
                                    )}
                                >
                                    {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
                                </span>
                                {t(`steps.${id}.name`)}
                            </button>
                        </li>
                    ))}
                </ol>
                <div>
                    <CardTitle className="text-xl">{t(`steps.${STEPS[step]}.title`)}</CardTitle>
                    <CardDescription>{t(`steps.${STEPS[step]}.description`)}</CardDescription>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {step === 0 && (
                    <StepFile accounts={accounts} accountId={accountId} onAccountChange={handleAccount} file={file} onFile={handleFile} table={table} />
                )}
                {step === 1 && (
                    <StepColumns
                        table={table}
                        decoded={decoded}
                        options={options}
                        onOptions={(changes) => setOptions({ ...options, ...changes })}
                        mapping={mapping}
                        onMapping={(changes) => setEdited({ signature, mapping: { ...mapping, ...changes } })}
                        formats={formats}
                        rows={rows}
                        account={account}
                        onChooseAccount={() => setStep(0)}
                    />
                )}
                {step === 2 && (
                    <StepCategories
                        groups={groups}
                        rows={rows}
                        choices={choices}
                        onChoice={(groupId, choice) => setChoices({ ...choices, [groupId]: choice })}
                        categories={categoryList}
                        account={account}
                        columns={table.columns}
                        mapping={mapping}
                        onCategoryCreated={addCategory}
                        onSubcategoryCreated={addSubcategory}
                    />
                )}
                {step === 3 && (
                    <StepPreview
                        result={result}
                        account={account}
                        categories={categoryList}
                        columns={table.columns}
                        rowEdits={rowEdits}
                        onTick={(index, checked) => setTicks({ ...ticks, [index]: checked })}
                        onTickMany={(indexes, checked) => setTicks({ ...ticks, ...Object.fromEntries(indexes.map((index) => [index, checked])) })}
                        onRowChoice={(index, choice) => setRowChoices({ ...rowChoices, [index]: choice })}
                        onRowEdit={editRow}
                        onRowReset={resetRow}
                        onCategoryCreated={addCategory}
                        onSubcategoryCreated={addSubcategory}
                        saveError={saveError}
                    />
                )}

                <div className="flex flex-wrap justify-between gap-4 border-t pt-6">
                    <Button type="button" variant="outline" disabled={step === 0 || saving} onClick={() => setStep(step - 1)}>
                        {t("back")}
                    </Button>
                    {step < 3 ? (
                        <Button type="button" variant="prominent" disabled={!canEnter[step + 1] || loadingContext} onClick={next}>
                            {loadingContext && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t("next")}
                        </Button>
                    ) : (
                        <Button type="button" variant="prominent" disabled={importBlocked} onClick={handleImport}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t("importButton", { count: result.summary.toImport })}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
