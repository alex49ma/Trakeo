// Built-in categories every user gets (created in checkUser). Nobody can rename or delete them, but their color
// can change; these are the defaults, all different, that "reset color" goes back to.
// Normal transactions can use the two defaults; the three transfer categories are reserved for internal transfers.
export const SYSTEM_CATEGORIES = [
    { systemKey: "OTHER_EXPENSES", name: "Other Expenses", type: "EXPENSE", color: "#94a3b8" },
    { systemKey: "OTHER_INCOME", name: "Other Income", type: "INCOME", color: "#10b981" },
    { systemKey: "TRANSFER_OUT", name: "Outgoing transfers", type: "EXPENSE", color: "#0ea5e9" },
    { systemKey: "TRANSFER_IN", name: "Incoming transfers", type: "INCOME", color: "#8b5cf6" },
    { systemKey: "TRANSFER_FEE", name: "Transfer fees", type: "EXPENSE", color: "#f59e0b" },
];

export const defaultSystemColor = (systemKey) =>
    SYSTEM_CATEGORIES.find((category) => category.systemKey === systemKey)?.color;

// Category colors are stored as "#rrggbb" (what <input type="color"> produces)
export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const TRANSFER_CATEGORY_KEYS = ["TRANSFER_OUT", "TRANSFER_IN", "TRANSFER_FEE"];

export const isTransferCategory = (category) => TRANSFER_CATEGORY_KEYS.includes(category?.systemKey);

// Built-in names are translated by key (SystemCategories namespace), every other category shows its own name
export const categoryLabel = (category, t) => (category?.systemKey ? t(category.systemKey) : category?.name);

// Money moved between your own accounts is neither income nor spending; only the fee is
export const countsInTotals = (transaction) =>
    !["TRANSFER_OUT", "TRANSFER_IN"].includes(transaction.category?.systemKey);

// Prisma category filters. Spelled out with OR because notIn on a nullable column also drops the NULL rows
export const NOT_TRANSFER_CATEGORY = {
    OR: [{ systemKey: null }, { systemKey: { in: ["OTHER_EXPENSES", "OTHER_INCOME"] } }],
};
export const COUNTS_IN_TOTALS_CATEGORY = {
    OR: [{ systemKey: null }, { systemKey: { in: ["OTHER_EXPENSES", "OTHER_INCOME", "TRANSFER_FEE"] } }],
};
