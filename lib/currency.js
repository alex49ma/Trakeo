// Currencies an account can hold. Adding one needs no migration: the database only checks the 3-letter format
export const SUPPORTED_CURRENCIES = ["EUR", "CZK", "USD", "GBP", "PLN", "CHF"];
export const DEFAULT_CURRENCY = "EUR";

export const isSupportedCurrency = (code) => SUPPORTED_CURRENCIES.includes(code);

// Minor units of a currency (2 for every supported one)
export const currencyDecimals = (currency) =>
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;

export const formatMoney = (amount, currency = DEFAULT_CURRENCY, locale = "en", options = {}) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, ...options }).format(Number(amount) || 0);

// "€1 = CZK 25.10" in English, with up to maxDecimals on the rate
export const formatRate = (rate, fromCurrency, toCurrency, locale = "en", maxDecimals = 6) =>
    `${formatMoney(1, fromCurrency, locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} = ${formatMoney(rate, toCurrency, locale, { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals })}`;

// The symbol or code a locale shows for a currency, e.g. "€" or "CZK"
export const currencySymbol = (currency, locale = "en") =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;

export const currencyName = (currency, locale = "en") =>
    new Intl.DisplayNames([locale], { type: "currency" }).of(currency) ?? currency;
