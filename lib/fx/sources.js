import z from "zod";
import { RATE_BASE_CURRENCY, RATE_CURRENCIES, todayIso } from "@/lib/fx/convert";

const ECB_LAST_90_DAYS_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml";
const FRANKFURTER_URL = "https://api.frankfurter.dev/v2/rates";
const REQUEST_TIMEOUT_MS = 15_000;

// One rate as the sources return it and as it's stored: units of currency per 1 EUR on a published date
const rateRow = z.object({
    date: z.iso.date().refine((date) => date <= todayIso(), "Dated in the future"),
    currency: z.enum(RATE_CURRENCIES),
    rate: z.string().regex(/^\d+(\.\d+)?$/, "Not a decimal number").refine((rate) => Number(rate) > 0, "Not positive"),
});

// Anything unexpected throws, so a format change never writes half the data. An empty answer counts as unexpected too,
// for example an HTML error page served with status 200
function validateRows(rows, source) {
    if (rows.length === 0) throw new Error(`No exchange rates found in the ${source} response`);

    for (const row of rows) {
        const parsed = rateRow.safeParse(row);
        if (!parsed.success) {
            throw new Error(`Unexpected rate from ${source}: ${JSON.stringify(row)} (${parsed.error.issues[0].message})`);
        }
    }
    return rows;
}

async function download(url) {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`${url} answered with status ${response.status}`);
    return response;
}

// The ECB's two files are written differently: the 90-day one is a single line with double quotes, the daily one has
// line breaks and single quotes. So the patterns assume neither
const ECB_DAY_PATTERN = /<Cube\s+time=["'](\d{4}-\d{2}-\d{2})["']\s*>([\s\S]*?)<\/Cube>/g;
const ECB_RATE_PATTERN = /<Cube\s+currency=["']([A-Z]{3})["']\s+rate=["']([^"']*)["']\s*\/>/g;

// Rows for the app's currencies, from an ECB reference rates file
export function parseEcbXml(xml) {
    const rows = [];
    for (const [, date, day] of xml.matchAll(ECB_DAY_PATTERN)) {
        for (const [, currency, rate] of day.matchAll(ECB_RATE_PATTERN)) {
            if (RATE_CURRENCIES.includes(currency)) rows.push({ date, currency, rate });
        }
    }
    return rows;
}

// The ECB's euro reference rates of the last 90 days: [{ date: "2026-10-30", currency: "CZK", rate: "24.353" }]
export async function fetchEcbLast90Days() {
    const response = await download(ECB_LAST_90_DAYS_URL);
    return validateRows(parseEcbXml(await response.text()), "ECB");
}

// The same ECB numbers through Frankfurter, for a range of "YYYY-MM-DD" dates. The fallback when the ECB fails
export async function fetchFrankfurter({ from, to }) {
    const params = new URLSearchParams({
        base: RATE_BASE_CURRENCY,
        quotes: RATE_CURRENCIES.join(","),
        providers: "ecb",
        from,
        to,
    });
    const response = await download(`${FRANKFURTER_URL}?${params}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Unexpected Frankfurter response");

    // Rates arrive as JSON numbers; String() gives back their exact text before big.js or Prisma sees them
    const rows = data
        .filter((row) => row?.base === RATE_BASE_CURRENCY && RATE_CURRENCIES.includes(row.quote))
        .map((row) => ({ date: row.date, currency: row.quote, rate: String(row.rate) }));
    return validateRows(rows, "Frankfurter");
}
