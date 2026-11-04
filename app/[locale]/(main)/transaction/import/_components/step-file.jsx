"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/currency";
import { IMPORT_MAX_FILE_BYTES } from "@/lib/csv-import/limits";
import { cn } from "@/lib/utils";
import Notice from "./notice";
import SavedSettings from "./saved-settings";

const MAX_FILE_MB = IMPORT_MAX_FILE_BYTES / (1024 * 1024);

export default function StepFile({ accounts, accountId, onAccountChange, file, onFile, table, profiles, onProfileRenamed, onProfileDeleted }) {
    const t = useTranslations("CsvImport");
    const locale = useLocale();
    const [error, setError] = useState(null);
    const [dragging, setDragging] = useState(false);

    const load = async (selected) => {
        if (!selected) return;
        setError(null);
        if (selected.size > IMPORT_MAX_FILE_BYTES) {
            setError(t("fileTooBig", { size: MAX_FILE_MB }));
            return;
        }
        try {
            onFile({ name: selected.name, buffer: await selected.arrayBuffer() });
        } catch {
            setError(t("fileUnreadable"));
        }
    };

    const rowCount = table?.dataRows.length ?? 0;

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium">{t("account")}</label>
                <Select value={accountId} onValueChange={onAccountChange}>
                    <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder={t("chooseAccount")} />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                                {account.name} ({formatMoney(account.balance, account.currency, locale)})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <span className="text-sm font-medium">{t("file")}</span>
                <label
                    htmlFor="csv-file"
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        load(event.dataTransfer.files?.[0]);
                    }}
                    className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:bg-muted/50",
                        dragging && "border-orange-400 bg-orange-50"
                    )}
                >
                    <FileUp className="h-8 w-8 text-muted-foreground" />
                    <span className="font-medium break-all">{file ? file.name : t("chooseFile")}</span>
                    <span className="text-xs text-muted-foreground">
                        {file ? t("chooseAnotherFile") : t("fileHint", { size: MAX_FILE_MB })}
                    </span>
                </label>
                <input
                    id="csv-file"
                    type="file"
                    accept=".csv,.txt,.tsv,text/csv,text/plain"
                    className="sr-only"
                    onChange={(event) => {
                        load(event.target.files?.[0]);
                        event.target.value = "";
                    }}
                />
            </div>

            {error && <Notice variant="error">{error}</Notice>}
            {file && table && rowCount === 0 && <Notice variant="error">{t("noRows")}</Notice>}
            {file && rowCount > 0 && (
                <p className="text-sm text-muted-foreground">{t("fileRead", { rows: rowCount, columns: table.columns.length })}</p>
            )}
            <p className="text-xs text-muted-foreground">{t("nothingSavedYet")}</p>

            <SavedSettings profiles={profiles} accounts={accounts} onRenamed={onProfileRenamed} onDeleted={onProfileDeleted} />
        </div>
    );
}
