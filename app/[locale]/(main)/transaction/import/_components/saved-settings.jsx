"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteImportProfile, renameImportProfile } from "@/actions/import";
import { IMPORT_MAX_SETTINGS_NAME } from "@/lib/csv-import/limits";

function SavedSetting({ profile, accounts, onRenamed, onDeleted }) {
    const t = useTranslations("CsvImport");
    const [renaming, setRenaming] = useState(false);
    const [name, setName] = useState(profile.name);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const lastAccount = accounts.find((account) => account.id === profile.lastAccountId);

    // Both actions return { success: false, error } for expected problems, with error a key of CsvImport.errors
    const run = async (action, onSuccess) => {
        setBusy(true);
        try {
            const response = await action();
            if (response.success) onSuccess(response);
            else toast.error(t(`errors.${response.error}`));
        } catch {
            toast.error(t("errors.unexpected"));
        } finally {
            setBusy(false);
        }
    };

    const rename = () => run(() => renameImportProfile({ id: profile.id, name }), (response) => {
        onRenamed(profile.id, response.name);
        setRenaming(false);
        toast.success(t("settingsRenamed"));
    });
    const remove = () => run(() => deleteImportProfile({ id: profile.id }), () => {
        onDeleted(profile.id);
        toast.success(t("settingsDeleted"));
    });

    if (renaming) {
        return (
            <li className="flex flex-wrap items-center gap-2 py-2">
                <Input
                    className="max-w-64 flex-1 bg-background"
                    value={name}
                    maxLength={IMPORT_MAX_SETTINGS_NAME}
                    aria-label={t("settingsName")}
                    onChange={(event) => setName(event.target.value)}
                />
                <Button type="button" size="sm" variant="outline" disabled={busy || !name.trim()} onClick={rename}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("saveName")}
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setRenaming(false); setName(profile.name); }}>
                    {t("cancel")}
                </Button>
            </li>
        );
    }

    return (
        <li className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0">
                <span className="block break-words font-medium">{profile.name}</span>
                {lastAccount && <span className="block text-xs text-muted-foreground">{t("lastUsedWith", { account: lastAccount.name })}</span>}
            </span>
            <span className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setRenaming(true)}>
                    <Pencil className="h-4 w-4" />
                    {t("rename")}
                </Button>
                {confirming ? (
                    <>
                        <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={remove}>
                            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t("confirmDelete")}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>{t("cancel")}</Button>
                    </>
                ) : (
                    <Button type="button" size="sm" variant="ghost" className="text-red-600" disabled={busy} onClick={() => setConfirming(true)}>
                        <Trash2 className="h-4 w-4" />
                        {t("delete")}
                    </Button>
                )}
            </span>
        </li>
    );
}

/** The user's saved import settings, to rename or delete. */
export default function SavedSettings({ profiles, accounts, onRenamed, onDeleted }) {
    const t = useTranslations("CsvImport");
    if (profiles.length === 0) return null;

    return (
        <div className="space-y-1 rounded-lg border p-3">
            <p className="text-sm font-medium">{t("savedSettings")}</p>
            <p className="text-xs text-muted-foreground">{t("savedSettingsHint")}</p>
            <ul className="divide-y">
                {profiles.map((profile) => (
                    <SavedSetting key={profile.id} profile={profile} accounts={accounts} onRenamed={onRenamed} onDeleted={onDeleted} />
                ))}
            </ul>
        </div>
    );
}
