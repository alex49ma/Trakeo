import Big from "big.js";
import { isValid, parse } from "date-fns";

// How many values of a column the detection looks at. Enough to be sure, and fast on big files
const DETECTION_SAMPLE = 300;
const EARLIEST_YEAR = 1900;

const MINUS_SIGNS = /[−‐-―﹣－]/g;

const sample = (values) => values.map((value) => String(value ?? "").trim()).filter(Boolean).slice(0, DETECTION_SAMPLE);

/**
 * The amount in a cell, as a decimal string with maxDecimals decimals ("-1500.50"), or null when it can't be read.
 * Accepts thousands separators, currency codes and symbols, any kind of space, apostrophes (Swiss "1'234.50"),
 * Unicode minus signs, a trailing minus ("15,00-") and parentheses for negatives ("(15,00)").
 * A value with more decimals than maxDecimals (trailing zeros aside) can't be read. Never goes through a float.
 */
export function parseAmount(text, decimal = ".", maxDecimals = 2) {
    let value = String(text ?? "").trim().replace(MINUS_SIGNS, "-");
    if (!value) return null;

    let negative = false;
    if (/^\(.*\)$/.test(value)) {
        negative = true;
        value = value.slice(1, -1);
    }

    // Letters (currency codes, "Kč", "Fr.") with a dot that belongs to them, then anything that isn't a digit, separator or sign
    value = value.replace(/\p{L}+\.?/gu, "").replace(/[^\d.,+-]/g, "");
    if (value.endsWith("-")) {
        negative = !negative;
        value = value.slice(0, -1);
    }
    if (value.startsWith("-")) {
        negative = !negative;
        value = value.slice(1);
    } else if (value.startsWith("+")) {
        value = value.slice(1);
    }

    const thousands = decimal === "," ? "." : ",";
    value = value.split(thousands).join("");
    if (decimal === ",") value = value.replace(",", ".");
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(value)) return null;

    const fraction = value.split(".")[1] ?? "";
    if (fraction.replace(/0+$/, "").length > maxDecimals) return null;

    const amount = new Big(value);
    if (amount.eq(0)) return new Big(0).toFixed(maxDecimals);
    return (negative ? amount.neg() : amount).toFixed(maxDecimals);
}

/**
 * Which separator is the decimal one, judging by the values of the amount columns.
 * Returns { decimal: "." | "," | null, sure }. decimal is null when no value has a separator; sure is false when
 * some value could go either way ("1,500") or the values disagree.
 */
export function detectDecimalSeparator(values) {
    let dot = 0;
    let comma = 0;
    let ambiguous = false;

    for (const raw of sample(values)) {
        const value = raw.replace(/[^\d.,]/g, "");
        const lastDot = value.lastIndexOf(".");
        const lastComma = value.lastIndexOf(",");
        if (lastDot < 0 && lastComma < 0) continue;

        // Both: the one further right separates the decimals
        if (lastDot >= 0 && lastComma >= 0) {
            if (lastComma > lastDot) comma++;
            else dot++;
            continue;
        }

        const separator = lastDot >= 0 ? "." : ",";
        // Used twice ("1.234.567"): it's the thousands separator
        if (value.split(separator).length > 2) {
            if (separator === ".") comma++;
            else dot++;
            continue;
        }

        // Three digits after it ("1,500") can be either
        const digitsAfter = value.length - value.lastIndexOf(separator) - 1;
        if (digitsAfter === 3) {
            ambiguous = true;
            continue;
        }

        if (separator === ".") dot++;
        else comma++;
    }

    if (dot === 0 && comma === 0) return { decimal: null, sure: !ambiguous };
    return { decimal: comma > dot ? "," : ".", sure: dot === 0 || comma === 0 };
}

/**
 * Date formats the import can read. Each pattern is checked before date-fns parses the value, so "yyyy" needs four
 * digits (date-fns alone reads "30.01.26" as the year 26). d and M accept one or two digits.
 * The order is the preference when several formats fit: day-first before month-first.
 */
export const DATE_FORMATS = [
    { id: "d.M.yyyy", label: "DD.MM.YYYY", pattern: /^\d{1,2}\.\d{1,2}\.\d{4}$/ },
    { id: "d/M/yyyy", label: "DD/MM/YYYY", pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/ },
    { id: "M/d/yyyy", label: "MM/DD/YYYY", pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/ },
    { id: "d-M-yyyy", label: "DD-MM-YYYY", pattern: /^\d{1,2}-\d{1,2}-\d{4}$/ },
    { id: "yyyy-M-d", label: "YYYY-MM-DD", pattern: /^\d{4}-\d{1,2}-\d{1,2}$/ },
    { id: "yyyy/M/d", label: "YYYY/MM/DD", pattern: /^\d{4}\/\d{1,2}\/\d{1,2}$/ },
    { id: "yyyy.M.d", label: "YYYY.MM.DD", pattern: /^\d{4}\.\d{1,2}\.\d{1,2}$/ },
    { id: "yyyyMMdd", label: "YYYYMMDD", pattern: /^\d{8}$/ },
    { id: "d.M.yy", label: "DD.MM.YY", pattern: /^\d{1,2}\.\d{1,2}\.\d{2}$/ },
    { id: "d/M/yy", label: "DD/MM/YY", pattern: /^\d{1,2}\/\d{1,2}\/\d{2}$/ },
    { id: "M/d/yy", label: "MM/DD/YY", pattern: /^\d{1,2}\/\d{1,2}\/\d{2}$/ },
];

/** The date part of a cell: without a time ("9:12:26", "T09:12:26Z", "2:30 PM"), spaces ("1. 10. 2026") or a final dot. */
export const cleanDateText = (text) => String(text ?? "")
    .trim()
    .replace(/[T\s]+\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2}|[AaPp][Mm])?$/, "")
    .replace(/\s+/g, "")
    .replace(/\.$/, "");

/** The date in a cell as local midnight (as the forms save dates), or null. Two-digit years land within 50 years of today. */
export function parseDate(text, formatId) {
    const format = DATE_FORMATS.find((candidate) => candidate.id === formatId);
    const value = cleanDateText(text);
    if (!format || !format.pattern.test(value)) return null;

    const date = parse(value, format.id, new Date());
    if (!isValid(date) || date.getFullYear() < EARLIEST_YEAR) return null;
    return date;
}

/**
 * The formats that read every non-empty value of a date column, in order of preference.
 * Returns { formats, best, ratio }: best is the first format that reads them all, or the one that reads the most
 * (null when none reads any), and ratio the share of values best reads.
 */
export function detectDateFormats(values) {
    const filled = sample(values);
    if (filled.length === 0) return { formats: [], best: null, ratio: 0 };

    const scores = DATE_FORMATS.map((format) => ({
        id: format.id,
        read: filled.filter((value) => parseDate(value, format.id)).length,
    }));
    const formats = scores.filter((score) => score.read === filled.length).map((score) => score.id);
    const top = scores.reduce((best, score) => (score.read > best.read ? score : best));

    return {
        formats,
        best: formats[0] ?? (top.read > 0 ? top.id : null),
        ratio: top.read / filled.length,
    };
}

/** Share of a column's non-empty values that read as amounts with the given decimal separator. */
export function amountRatio(values, decimal) {
    const filled = sample(values);
    if (filled.length === 0) return 0;
    return filled.filter((value) => parseAmount(value, decimal, 4) !== null).length / filled.length;
}
