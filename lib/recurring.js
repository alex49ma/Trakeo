import { addDays, addMonths, addWeeks, addYears } from "date-fns";

// One interval after `date`. date-fns clamps month ends (Jan 31 + 1 month = Feb 28), where setMonth would roll over to March
export function calculateNextRecurringDate(date, interval) {
    const start = new Date(date);

    switch (interval) {
        case "DAILY":
            return addDays(start, 1);
        case "WEEKLY":
            return addWeeks(start, 1);
        case "MONTHLY":
            return addMonths(start, 1);
        case "YEARLY":
            return addYears(start, 1);
        default:
            throw new Error(`Unsupported recurring interval: ${interval}`);
    }
}

// The first occurrence after `now`, keeping the schedule anchored to `date` (a run that's late doesn't shift later dates)
export function nextOccurrenceAfter(date, interval, now = new Date()) {
    let next = calculateNextRecurringDate(date, interval);
    while (next <= now) next = calculateNextRecurringDate(next, interval);
    return next;
}
