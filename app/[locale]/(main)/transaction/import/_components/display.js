import { format } from "date-fns";
import { enUS, es } from "date-fns/locale";

// Same mapping as the rest of the app: Spanish, and English for everything else
export const dateLocaleOf = (locale) => (locale === "es" ? es : enUS);

export const formatRowDate = (date, locale) => (date ? format(date, "PP", { locale: dateLocaleOf(locale) }) : "");

// A column's name, or "Column 3" for one without a header
export const columnLabel = (columns, index, t) => (columns[index] ? columns[index] : t("unnamedColumn", { number: index + 1 }));

/** Why a row isn't imported, or "Ready". t is the CsvImport translator. */
export function rowStatusText(row, columns, t) {
    switch (row.status) {
        case "filtered":
            return t("status.filtered", { column: columnLabel(columns, row.reason, t) });
        case "otherCurrency":
            return t("status.otherCurrency", { currency: row.reason });
        case "unreadable":
            if (row.reason === "futureDate") return t("status.futureDate", { value: row.raw });
            if (row.reason === "amount") return t("status.badAmount", { value: row.raw || "—" });
            return t("status.badDate", { value: row.raw || "—" });
        case "zero":
            return t("status.zero");
        case "skipped":
            return t("status.skipped");
        case "invalidEdit":
            return t("status.invalidEdit");
        default:
            return t("status.ready");
    }
}
