import Papa from "papaparse";

export const DELIMITERS = [",", ";", "\t", "|"];
// The header row is searched for among the first rows only: bank preambles are a few lines long
export const HEADER_SEARCH_ROWS = 20;
const DELIMITER_SAMPLE_LINES = 50;

const parseWith = (text, delimiter) =>
    Papa.parse(text, { header: false, skipEmptyLines: "greedy", delimiter }).data.map((row) => row.map((cell) => String(cell ?? "")));

/**
 * The delimiter that splits the first lines into the most rows of one width (of at least two cells), the wider on a tie.
 * papaparse's own guess gets confused by preambles and by commas inside amounts ("2.150,00;3.450,00").
 */
export function guessDelimiter(text) {
    const sampleText = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, DELIMITER_SAMPLE_LINES).join("\n");
    let best = { delimiter: DELIMITERS[0], rows: 0, width: 0 };
    for (const delimiter of DELIMITERS) {
        const rows = parseWith(sampleText, delimiter);
        const width = commonWidth(rows);
        const count = rows.filter((row) => row.length === width).length;
        if (width < 2) continue;
        if (count > best.rows || (count === best.rows && width > best.width)) best = { delimiter, rows: count, width };
    }
    return best.delimiter;
}

/** Splits the text into rows of cells, with the given delimiter or, for "auto", guessDelimiter's. */
export function readRows(text, delimiter = "auto") {
    const used = delimiter === "auto" ? guessDelimiter(text) : delimiter;
    return { rows: parseWith(text, used), delimiter: used };
}

// The most common number of cells per row (the wider one on a tie)
function commonWidth(rows) {
    const counts = new Map();
    for (const row of rows) counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
    let best = 0;
    let bestCount = 0;
    for (const [width, count] of counts) {
        if (count > bestCount || (count === bestCount && width > best)) {
            best = width;
            bestCount = count;
        }
    }
    return best;
}

// Numbers, dates and amounts: what data rows hold and headers don't
const looksNumeric = (cell) => /\d/.test(cell) && /^[\s\d.,:/+\-−'()]+$/.test(cell);

const isHeaderLike = (row) => {
    const filled = row.map((cell) => cell.trim()).filter(Boolean);
    return filled.length >= 2 && filled.filter(looksNumeric).length * 2 <= filled.length;
};

/**
 * Index of the header row: the first of the first rows that has at least two cells, is mostly text, and has as many
 * cells as most rows below it. That skips bank preambles (account number, period...) and Excel's "sep=;" line.
 * A second, looser pass allows one cell less (data rows that end with a delimiter). Falls back to the first row.
 */
export function findHeaderRow(rows) {
    const width = commonWidth(rows.slice(0, 200));
    const limit = Math.min(rows.length, HEADER_SEARCH_ROWS);
    for (let i = 0; i < limit; i++) {
        if (rows[i].length === width && isHeaderLike(rows[i])) return i;
    }
    for (let i = 0; i < limit; i++) {
        if (rows[i].length >= width - 1 && isHeaderLike(rows[i])) return i;
    }
    return 0;
}

/** Column names from the header cells: trimmed, "" when empty, and repeated names numbered ("Amount (2)"). */
export function columnNames(headerCells, width) {
    const seen = new Map();
    return Array.from({ length: Math.max(width, headerCells.length) }, (_, index) => {
        const name = (headerCells[index] ?? "").trim();
        if (!name) return "";
        const count = (seen.get(name) ?? 0) + 1;
        seen.set(name, count);
        return count > 1 ? `${name} (${count})` : name;
    });
}

/**
 * Reads the decoded text as a table. headerRow is "auto" or a 0-based row index.
 * Returns { rows, delimiter, headerIndex, columns, dataRows }: rows are every row of the file, dataRows the ones
 * after the header, and columns the header names (an empty string for a column without a name).
 */
export function readTable(text, { delimiter = "auto", headerRow = "auto" } = {}) {
    const { rows, delimiter: usedDelimiter } = readRows(text, delimiter);
    if (rows.length === 0) return { rows, delimiter: usedDelimiter, headerIndex: 0, columns: [], dataRows: [] };

    const headerIndex = headerRow === "auto" ? findHeaderRow(rows) : Math.min(Number(headerRow), rows.length - 1);
    const dataRows = rows.slice(headerIndex + 1);
    const columns = columnNames(rows[headerIndex], commonWidth(dataRows));
    return { rows, delimiter: usedDelimiter, headerIndex, columns, dataRows };
}
