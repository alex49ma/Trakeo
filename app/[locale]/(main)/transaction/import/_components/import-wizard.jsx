"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { currencyDecimals } from "@/lib/currency";
import { decodeBytes } from "@/lib/csv-import/decode";
import { readTable } from "@/lib/csv-import/table";
import { guessMapping } from "@/lib/csv-import/guess";
import { buildGroups, buildRows, resolveFormats } from "@/lib/csv-import/rows";
import { IMPORT_MAX_ROWS, IMPORT_MAX_SETTINGS_NAME } from "@/lib/csv-import/limits";
import { buildSettings, findSavedSettings, headerSignature, settingsFit, settingsToMapping } from "@/lib/csv-import/signature";
import { getImportContext, importTransactions } from "@/actions/import";
import { cn } from "@/lib/utils";
import { buildPayload, resolveImport } from "./choices";
import StepFile from "./step-file";
import StepColumns from "./step-columns";
import StepCategories from "./step-categories";
import StepPreview from "./step-preview";
import Notice from "./notice";

const STEPS = ["file", "columns", "categories", "preview"];
const DEFAULT_OPTIONS = { encoding: "auto", delimiter: "auto", headerRow: "auto" };

/*
 * The CSV import: file and account, columns, categories, preview. Everything stays in this component's state, and
 * nothing is saved until "Import" in the preview. What the steps show is derived from the file and the choices.
 * Saved settings (profiles) set up the columns of a file whose header row they recognize, and are saved on import.
 */
export default function ImportWizard({ accounts, categories, profiles: initialProfiles, initialAccountId, accountFromUrl }) {
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
    const [profiles, setProfiles] = useState(initialProfiles);
    // The saved settings in use: { id, exact }, exact when the file's header row matched them
    const [applied, setApplied] = useState(null);
    // An account chosen in the URL or by hand is never replaced by the one saved settings were last used with
    const [accountChosen, setAccountChosen] = useState(accountFromUrl);
    const [remember, setRemember] = useState(true);
    // null: the default name (the settings in use, or the account's name)
    const [settingsName, setSettingsName] = useState(null);

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
    const appliedProfile = applied ? profiles.find((profile) => profile.id === applied.id) ?? null : null;
    const profileMapping = useMemo(
        () => (appliedProfile && table ? settingsToMapping(appliedProfile.settings.mapping, table.columns) : null),
        [appliedProfile, table]
    );
    const mapping = edited && edited.signature === signature ? edited.mapping : profileMapping ?? guessed;
    // Saved settings whose columns this file has, offered in step 2 when none matched the header row exactly
    const fittingProfile = !applied && table ? profiles.find((profile) => settingsFit(profile.settings.mapping, table.columns)) : null;

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
        const match = findSavedSettings(loaded.buffer, profiles, locale);
        setFile(loaded);
        setOptions(match
            ? { encoding: match.profile.settings.encoding, delimiter: match.profile.settings.delimiter, headerRow: match.headerIndex }
            : DEFAULT_OPTIONS);
        setApplied(match ? { id: match.profile.id, exact: true } : null);
        setSettingsName(null);
        const lastAccount = match && accounts.find((candidate) => candidate.id === match.profile.lastAccountId);
        if (lastAccount && !accountChosen) setAccountId(lastAccount.id);
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
        setAccountChosen(true);
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

    const applyProfile = (profile) => {
        setApplied({ id: profile.id, exact: false });
        setEdited(null);
    };
    // Back to the automatic choices. The steps after the columns depend on them, so the columns are shown again
    const stopUsingProfile = () => {
        setApplied(null);
        setOptions(DEFAULT_OPTIONS);
        setEdited(null);
        if (step > 1) setStep(1);
    };
    const renameProfile = (id, name) => setProfiles((list) => list.map((profile) => (profile.id === id ? { ...profile, name } : profile)));
    const deleteProfile = (id) => {
        setProfiles((list) => list.filter((profile) => profile.id !== id));
        if (applied?.id === id) stopUsingProfile();
    };

    const nameToSave = (settingsName ?? appliedProfile?.name ?? account?.name ?? "").slice(0, IMPORT_MAX_SETTINGS_NAME);
    const profileToSave = () => (remember && table
        ? {
            ...(appliedProfile && { id: appliedProfile.id }),
            name: nameToSave.trim() || account.name.slice(0, IMPORT_MAX_SETTINGS_NAME),
            headerSignature: headerSignature(table.columns),
            settings: buildSettings(options, mapping, table.columns),
        }
        : undefined);

    const handleImport = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            const profile = profileToSave();
            const response = await importTransactions({ ...buildPayload(result, accountId, categoryList), profile });
            if (!response.success) {
                setSaveError(t(`errors.${response.error}`));
                return;
            }
            setSaved(true);
            if (response.profileSaved) toast.success(t("successWithSettings", { count: response.created, name: profile.name }));
            else toast.success(t("success", { count: response.created }));
            if (response.profileSaved === false) toast.warning(t("settingsNotSaved"));
            router.push(`/account/${accountId}`);
        } catch {
            setSaveError(t("errors.unexpected"));
        } finally {
            setSaving(false);
        }
    };

    const next = () => {
        if (step === 2) return goToPreview();
        if (step === 0 && applied && readyCount > 0) return setStep(2);
        return setStep(step + 1);
    };
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
                {appliedProfile && file && (
                    <Notice
                        variant="info"
                        action={(
                            <span className="flex flex-wrap gap-2">
                                {step !== 1 && (
                                    <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => setStep(1)}>{t("changeColumns")}</Button>
                                )}
                                <Button type="button" size="sm" variant="outline" className="bg-white" onClick={stopUsingProfile}>{t("stopUsingSettings")}</Button>
                            </span>
                        )}
                    >
                        {t("settingsApplied", { name: appliedProfile.name })}
                    </Notice>
                )}
                {step === 1 && fittingProfile && (
                    <Notice
                        variant="info"
                        action={<Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => applyProfile(fittingProfile)}>{t("useSettings")}</Button>}
                    >
                        {t("settingsOffer", { name: fittingProfile.name })}
                    </Notice>
                )}
                {step === 0 && (
                    <StepFile
                        accounts={accounts}
                        accountId={accountId}
                        onAccountChange={handleAccount}
                        file={file}
                        onFile={handleFile}
                        table={table}
                        profiles={profiles}
                        onProfileRenamed={renameProfile}
                        onProfileDeleted={deleteProfile}
                    />
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

                {step === 3 && (
                    <div className="space-y-2 rounded-lg border p-3">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <Checkbox checked={remember} onCheckedChange={(checked) => setRemember(checked === true)} />
                            {t("rememberSettings")}
                        </label>
                        {remember && (
                            <Input
                                className="max-w-80 bg-background"
                                value={nameToSave}
                                maxLength={IMPORT_MAX_SETTINGS_NAME}
                                aria-label={t("settingsName")}
                                placeholder={t("settingsName")}
                                onChange={(event) => setSettingsName(event.target.value)}
                            />
                        )}
                        <p className="text-xs text-muted-foreground">{t("rememberHint")}</p>
                    </div>
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
