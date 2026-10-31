import Big from "big.js";

// The three values of an exchange, as named in the form
export const EXCHANGE_FIELDS = ["fromAmount", "rate", "toAmount"];

// Form field names <-> the ExchangeField enum stored on the transfer
export const DERIVED_FIELD_ENUM = { fromAmount: "FROM_AMOUNT", rate: "RATE", toAmount: "TO_AMOUNT" };
export const DERIVED_FIELD_NAME = { FROM_AMOUNT: "fromAmount", RATE: "rate", TO_AMOUNT: "toAmount" };

const RATE_DECIMALS = 10;

const isEmpty = (raw) => raw === undefined || raw === null || String(raw).trim() === "";

// Reads one typed value. Returns { value } (null when empty) or { error }
function readValue(raw, field, decimals) {
    if (isEmpty(raw)) return { value: null };

    let value;
    try {
        value = new Big(String(raw).trim());
    } catch {
        return { error: { field, code: "invalidNumber" } };
    }
    if (value.lte(0)) return { error: { field, code: "mustBePositive" } };
    if (decimals !== undefined && !value.round(decimals).eq(value)) {
        return { error: { field, code: "tooManyDecimals", decimals } };
    }
    return { value };
}

/**
 * Completes an exchange from the two values the user typed; derivedField names the one to calculate.
 * fromAmount is everything that leaves the source account, fee included, and the rate converts what's
 * left after the fee: toAmount = (fromAmount - fee) * rate. Same-currency transfers use rate 1.
 * All math is exact (big.js), rounding half up. Returns fixed-decimal strings or { error: { field, code } }.
 */
export function resolveExchange({ fromAmount, rate, toAmount, fee, derivedField = "toAmount", sameCurrency = false, fromDecimals = 2, toDecimals = 2 }) {
    const raw = { fromAmount, rate, toAmount };
    const decimals = { fromAmount: fromDecimals, rate: undefined, toAmount: toDecimals };
    const derived = sameCurrency ? "toAmount" : derivedField;

    let feeValue = new Big(0);
    if (!isEmpty(fee)) {
        try {
            feeValue = new Big(String(fee).trim());
        } catch {
            return { error: { field: "fee", code: "invalidNumber" } };
        }
        if (feeValue.lt(0)) return { error: { field: "fee", code: "feeNegative" } };
        if (!feeValue.round(fromDecimals).eq(feeValue)) {
            return { error: { field: "fee", code: "tooManyDecimals", decimals: fromDecimals } };
        }
    }

    const inputs = { rate: sameCurrency ? new Big(1) : null };
    for (const field of EXCHANGE_FIELDS) {
        if (field === derived || (sameCurrency && field === "rate")) continue;
        const { value, error } = readValue(raw[field], field, decimals[field]);
        if (error) return { error };
        if (value === null) return { error: { field, code: "required" } };
        inputs[field] = value;
    }

    let { fromAmount: from, rate: rateValue, toAmount: to } = inputs;
    if (derived === "fromAmount") {
        from = to.div(rateValue).plus(feeValue).round(fromDecimals, Big.roundHalfUp);
        if (from.lte(feeValue)) return { error: { field: "fromAmount", code: "resultTooSmall" } };
    } else {
        if (feeValue.gte(from)) return { error: { field: "fee", code: "feeTooHigh" } };
        if (derived === "toAmount") {
            to = from.minus(feeValue).times(rateValue).round(toDecimals, Big.roundHalfUp);
            if (to.lte(0)) return { error: { field: "toAmount", code: "resultTooSmall" } };
        } else {
            rateValue = to.div(from.minus(feeValue)).round(RATE_DECIMALS, Big.roundHalfUp);
            if (rateValue.lte(0)) return { error: { field: "rate", code: "resultTooSmall" } };
        }
    }

    return {
        fromAmount: from.toFixed(fromDecimals),
        fee: feeValue.toFixed(fromDecimals),
        rate: rateValue.toFixed(RATE_DECIMALS),
        toAmount: to.toFixed(toDecimals),
        derivedField: DERIVED_FIELD_ENUM[derived],
    };
}

// The rate as the form shows it: up to 6 decimals, no trailing zeros. The stored rate keeps 10
export const displayRate = (rate) => new Big(rate).round(6, Big.roundHalfUp).toString();

// How many source units one destination unit buys, rounded to 4 decimals
export const inverseRate = (rate) => new Big(1).div(rate).round(4, Big.roundHalfUp).toString();
