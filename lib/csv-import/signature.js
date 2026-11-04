import { decodeBytes } from "./decode";
import { normalizeName } from "./keys";
import { columnNames, HEADER_SEARCH_ROWS, readRows } from "./table";

/*
 * Saved import settings (ImportProfile): the encoding, separator and column mapping of one bank's CSV, found again by
 * the file's header row. Columns are saved by header name, so a bank reordering its columns doesn't break them.
 */

export const SETTINGS_VERSION = 1;
// Saved settings are looked for in the file's first lines only: that's where the header row is
const DETECTION_LINES = 60;

/** The key saved settings are found by: the header names under normalizeName, joined with "|", without trailing empty columns. */
export function headerSignature(columns) {
    const names = columns.map(normalizeName);
    while (names.length > 0 && !names.at(-1)) names.pop();
    return names.join("|");
}

// A column as saved: its header name, or "#3" (its position) for a column without one
const columnRef = (columns, index) => {
    if (index === null || index === undefined) return null;
    return columns[index] ? columns[index] : `#${index}`;
};

// A saved column on this file: its index, null when the settings have none, undefined when the file lacks it
function columnIndex(columns, ref) {
    if (ref === null || ref === undefined) return null;
    if (/^#\d+$/.test(ref)) {
        const index = Number(ref.slice(1));
        return index < columns.length && !columns[index] ? index : undefined;
    }
    const index = columns.indexOf(ref);
    return index >= 0 ? index : undefined;
}

/** The wizard's options and mapping as settings to save. The header row isn't saved: it's found again in each file. */
export function buildSettings(options, mapping, columns) {
    const ref = (index) => columnRef(columns, index);
    return {
        version: SETTINGS_VERSION,
        encoding: options.encoding,
        delimiter: options.delimiter,
        mapping: {
            date: ref(mapping.date),
            dateFormat: mapping.dateFormat,
            amountLayout: mapping.amountLayout,
            amount: mapping.amountLayout === "signed" ? ref(mapping.amount) : null,
            moneyIn: mapping.amountLayout === "split" ? ref(mapping.moneyIn) : null,
            moneyOut: mapping.amountLayout === "split" ? ref(mapping.moneyOut) : null,
            fee: ref(mapping.fee),
            decimal: mapping.decimal,
            invert: mapping.invert,
            description: mapping.description.filter((index) => index !== null).map(ref),
            groupBy: ref(mapping.groupBy),
            currency: ref(mapping.currency),
            filters: mapping.filters
                .filter((filter) => filter.column !== null)
                .map((filter) => ({ column: ref(filter.column), values: filter.values })),
        },
    };
}

/** A saved mapping on this file's columns. A column the file doesn't have stays empty, for the user to choose in step 2. */
export function settingsToMapping(saved, columns) {
    const index = (ref) => columnIndex(columns, ref) ?? null;
    return {
        date: index(saved.date),
        dateFormat: saved.dateFormat,
        amountLayout: saved.amountLayout,
        amount: index(saved.amount),
        moneyIn: index(saved.moneyIn),
        moneyOut: index(saved.moneyOut),
        fee: index(saved.fee),
        decimal: saved.decimal,
        invert: saved.invert,
        description: saved.description.map(index).filter((value) => value !== null),
        groupBy: index(saved.groupBy),
        currency: index(saved.currency),
        filters: saved.filters
            .map((filter) => ({ column: index(filter.column), values: filter.values }))
            .filter((filter) => filter.column !== null),
    };
}

/** Whether this file has every column a saved mapping uses (for files whose header row changed a little). */
export function settingsFit(saved, columns) {
    const refs = [
        saved.date, saved.amount, saved.moneyIn, saved.moneyOut, saved.fee, saved.groupBy, saved.currency,
        ...saved.description, ...saved.filters.map((filter) => filter.column),
    ].filter((ref) => ref !== null);
    return saved.date !== null && refs.every((ref) => columnIndex(columns, ref) !== undefined);
}

/**
 * The saved settings whose header row is in this file, as { profile, headerIndex }, or null.
 * Each profile is tried with its own encoding and separator, on the file's first lines, so a file is recognized even
 * when the automatic choices would read it differently.
 */
export function findSavedSettings(buffer, profiles, locale) {
    const texts = new Map();
    for (const profile of profiles) {
        const { encoding, delimiter } = profile.settings;
        if (!texts.has(encoding)) texts.set(encoding, decodeBytes(buffer, encoding, locale).text);

        const head = texts.get(encoding).split(/\r?\n/).slice(0, DETECTION_LINES).join("\n");
        const { rows } = readRows(head, delimiter);
        const limit = Math.min(rows.length, HEADER_SEARCH_ROWS);
        for (let index = 0; index < limit; index++) {
            if (headerSignature(columnNames(rows[index], rows[index].length)) === profile.headerSignature) {
                return { profile, headerIndex: index };
            }
        }
    }
    return null;
}
