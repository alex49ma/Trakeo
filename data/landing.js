import { User, Briefcase, Plane } from "lucide-react";

// Each slice's share of the total, in whole percents
const withPercents = (slices) => {
    const total = slices.reduce((sum, { amount }) => sum + amount, 0);
    return slices.map((slice) => ({ ...slice, percent: Math.round((slice.amount / total) * 100) }));
};

// Sample data for the landing page's mock UI (app/[locale]/_components). The numbers are made up, but the copy in
// messages/*.json (Landing) tells the same story: €200 sent to the Czech account on Day 6, 76% of the budget on
// Day 14, a month that went mostly on rent. Change the two together
export const SAMPLE = {
    // The hero's budget card
    budget: { spent: 1184.3, limit: 1600 },
    accounts: [
        { key: "mainAccount", currency: "EUR", balance: 2431.2 },
        { key: "czechAccount", currency: "CZK", balance: 12350 },
        { key: "travelCard", currency: "USD", balance: 412.75 },
    ],
    salary: { amount: 2350, date: Date.UTC(2026, 9, 1) },
    groceries: 54.2,
    // Day 6: the rate the user's bank gave, next to the ECB reference rate
    transfer: { amount: 200, rate: 25.1, ecbRate: 25.24 },
    // Day 14
    monthBudget: { spent: 1216, limit: 1600 },
    // Day 22: the first rows of last month's statement
    csvImport: {
        rowCount: 8,
        rows: [
            { key: "pharmacy", date: Date.UTC(2026, 8, 28), amount: -12.4 },
            { key: "trainTicket", date: Date.UTC(2026, 8, 29), amount: -23 },
            { key: "refund", date: Date.UTC(2026, 8, 30), amount: 18.99 },
        ],
    },
    // October's expenses, in the hero and on Day 30. stroke and swatch color the donut and its legend
    breakdown: withPercents([
        { key: "housing", amount: 570, stroke: "stroke-orange-700", swatch: "bg-orange-700" },
        { key: "food", amount: 390, stroke: "stroke-orange-400", swatch: "bg-orange-400" },
        { key: "bills", amount: 315, stroke: "stroke-trakeo-teal", swatch: "bg-trakeo-teal" },
        { key: "leisure", amount: 225, stroke: "stroke-orange-300", swatch: "bg-orange-300" },
    ]),
    // Who is Trakeo for?
    subscriptions: [
        { key: "streaming", amount: 12.99 },
        { key: "gym", amount: 29 },
        { key: "phone", amount: 15 },
    ],
    freelance: { business: 3120, personal: 2431.2 },
    travel: [
        // Whole korunas, the way Czech prices are written
        { key: "dinner", amount: 890, currency: "CZK", wholeUnits: true },
        { key: "hotel", amount: 145, currency: "EUR" },
        { key: "lunch", amount: 18.5, currency: "GBP" },
    ],
};

// Testimonials Data example
export const testimonialsData = [
    {
        icon: <User className="h-8 w-8 text-orange-600" />,
    },
    {
        icon: <Briefcase className="h-8 w-8 text-orange-600" />,
    },
    {
        icon: <Plane className="h-8 w-8 text-orange-600" />,
    },
];
