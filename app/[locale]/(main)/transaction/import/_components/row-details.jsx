"use client";

import { useTranslations } from "next-intl";
import { columnLabel } from "./display";

/** Every non-empty cell of a row as the file has it, "column: value", to help remember what a payment was. */
export default function RowDetails({ cells, columns }) {
    const t = useTranslations("CsvImport");
    const filled = columns
        .map((_, index) => ({ index, value: String(cells[index] ?? "").trim() }))
        .filter((cell) => cell.value);

    return (
        <dl className="grid gap-x-4 gap-y-1 rounded-md bg-muted/40 p-2 text-xs sm:grid-cols-[minmax(6rem,auto)_1fr]">
            {filled.map((cell) => (
                <div key={cell.index} className="contents">
                    <dt className="font-medium text-muted-foreground">{columnLabel(columns, cell.index, t)}</dt>
                    <dd className="break-words">{cell.value}</dd>
                </div>
            ))}
        </dl>
    );
}
