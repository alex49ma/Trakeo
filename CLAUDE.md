# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Trakeo is a personal finance tracker: multiple accounts, each in one currency (EUR, CZK, USD, GBP, PLN or CHF), income/expense transactions with user-defined colored categories and subcategories, internal transfers between accounts (with currency exchange when the currencies differ), recurring transactions, CSV bulk import, a monthly budget bar, an analytics view, daily ECB exchange rates (a reference in the transfer form, plus converted totals in analytics and on the dashboard), and a feedback button. It is deployed on Vercel's **free plan**, and that size limit has shaped some of the code (see "Middleware bundle size").

Stack: Next.js 16 App Router (React 19, mostly plain JS: `.js`/`.jsx`, with only `middleware.ts`, `lib/prisma.ts` and `prisma.config.ts` in TS), Clerk auth, Prisma 7 on PostgreSQL, Inngest background jobs, next-intl i18n, Arcjet bot protection, Tailwind CSS v4 with shadcn/ui, react-hook-form with zod, and recharts.

## Commands

```bash
npm install                      # also runs `prisma generate` (postinstall)
npm run dev                      # Next dev server on http://localhost:3000
npx inngest-cli@latest dev       # run alongside `dev`; needed for recurring transactions and exchange rates locally
npm run build && npm start
npm run lint                     # ESLint flat config (eslint-config-next core-web-vitals)
npx eslint <path>                # lint a single file

# Bundle analysis (opens analyzer reports after build)
ANALYZE=true npm run build                      # bash
$env:ANALYZE='true'; npm run build              # PowerShell

# Prisma (config in prisma.config.ts; reads DATABASE_URL from .env via dotenv)
npx prisma migrate dev --name <name>
npx prisma migrate dev --create-only --name <name>   # write the SQL, edit it (CHECK constraints), then apply
npx prisma generate
npx prisma studio
```

`prisma migrate dev` is interactive, so it fails in a non-interactive shell (an agent's). There, write the migration with `npx prisma migrate diff --from-schema <old schema> --to-schema prisma/schema.prisma --script` into a new `prisma/migrations/<timestamp>_<name>/migration.sql` and apply it with `npx prisma migrate deploy`. Prisma refuses `migrate reset` from an AI agent until the user explicitly consents. The consent is passed in `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`.

There is no test framework or test suite yet (Vitest is planned). `test-date.js` is a scratch Node script (`node test-date.js`) for checking the CSV date and amount parsing rules. Design documents and manual test plans live in `../SDD/`, next to the repo, one folder per feature:
- Multi-currency accounts and internal transfers: `../SDD/multicurrency_specs/` (`multicurrency-accounts-and-exchanges-migration-plan.md`, `multicurrency-test-plan.md`).
- Daily exchange rates and cross-currency reporting: `../SDD/exchange-rates-and-cross-currency-reporting/` (`exchange-rates-and-cross-currency-reporting-plan.md`, `exchange-rates-test-plan.md`).

Required env vars (in `.env`, which is gitignored): `DATABASE_URL`, `ARCJET_KEY`, plus the standard Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).

## Architecture

### Request flow and routing
- Every page lives under `app/[locale]/`. Route groups: `(auth)` for the Clerk sign-in/sign-up catch-all pages and `(main)` for the app pages `dashboard`, `account/[id]`, `transaction/create`, `transaction/transfer` (internal transfers; `?from=<accountId>` preselects the source, `?edit=<transferId>` edits) and `analytics`. Route-private components sit in sibling `_components/` folders, and shared ones in `components/` (shadcn primitives in `components/ui/`).
- `middleware.ts` chains Clerk and next-intl. Protected routes are listed explicitly in `isProtectedRoute`, in both the plain and `/:locale/` forms, so **a new protected page must be added there in both forms**. `/api/*` skips the intl middleware.
- The root `app/[locale]/layout.js` runs Arcjet (`aj.protect`, shield + bot detection) on every page render and calls `notFound()` when a request is denied. `createTransaction` also calls `aj.protect` and still checks `isRateLimit()`, but the token-bucket rule was removed, so no rate limit is configured. The root layout also mounts `ClerkProvider`, `NextIntlClientProvider`, `Header`, `Toaster` and `FeedbackButton`.
- `app/[locale]/(main)/dashboard/layout.js` imports and renders `DashboardPage` directly inside `<Suspense>` and ignores `children`.

### Data layer: server actions in `actions/`
Server components fetch data by calling server actions directly (`getUserAccounts`, `getDashboardData`, `getCategories`, ...), and client components call mutations through the `useFetch` hook (`hooks/use-fetch.jsx`). That hook wraps an action, tracks `loading`/`data`/`error`, and shows a sonner toast when the action throws. Client components then watch `data?.success` in a `useEffect` to show a success toast or navigate.

Conventions that span multiple files:
- **Users.** Clerk's user id maps to `User.clerkUserId`, and actions use the DB `user.id` for every query. Most actions do `auth()` followed by `db.user.findUnique({ where: { clerkUserId } })`. `lib/checkUser.js` does the same lookup but also **creates the DB user on first visit** with the five built-in categories (see below). It is called from `Header` on every render, which is how users get created. The transaction form picks its default category by `systemKey: "OTHER_EXPENSES"`.
- **Built-in categories.** `Category.systemKey` marks five locked categories per user, defined in `lib/system-categories.js`: `OTHER_EXPENSES` and `OTHER_INCOME` (usable by normal transactions, subcategories allowed), and `TRANSFER_OUT`, `TRANSFER_IN` and `TRANSFER_FEE` (reserved for transfer transactions, no subcategories). Find them by `systemKey`, never by name. `updateCategory`/`deleteCategory` refuse them, `createSubcategory` and `assertCategoryOwnership` refuse the transfer ones, and CSV matching skips the transfer ones. Show names with `categoryLabel(category, t)` (namespace `SystemCategories`), because built-in names are translated by key.
- **Currencies.** `Account.currency` is set when the account is created and never changes. Every amount is in its account's currency, and transactions store no currency. Format money with `formatMoney(amount, currency, locale)` from `lib/currency.js`, never with a hard-coded `€`. Never add amounts from accounts in different currencies directly: convert them first with `lib/fx/report.js` (see "Exchange rates"). Analytics also offers one group per currency, and `Budget.currency` follows the default account (with a notice when they differ).
- **Internal transfers** (`actions/transfer.js`). A `Transfer` row plus 2–3 normal transactions linked by `transferId`: outgoing (`TRANSFER_OUT`, EXPENSE) and an optional fee (`TRANSFER_FEE`, EXPENSE) in the source account, and incoming (`TRANSFER_IN`, INCOME) in the destination. `fromAmount` includes the fee: `toAmount = (fromAmount - fee) * rate`, and the rate is fixed at 1 between accounts in the same currency. `resolveExchange` in `lib/exchange.js` (big.js, exact decimals) is shared by the form and the actions, and the server always recalculates the derived value. Transfers are edited only as a whole: `updateTransaction` refuses transfer transactions, and `bulkDeleteTransactions` expands any selected transfer transaction to the whole transfer. Charts, pies and the budget leave out the two transfer-direction categories with `countsInTotals` (client) or `COUNTS_IN_TOTALS_CATEGORY` (Prisma); fees still count. Don't filter a nullable column like `systemKey` with `notIn`/`not`, because SQL also drops the NULL rows. `updateTransaction` also refuses moving a transaction to an account in another currency.
- **Scoping.** Every query and mutation is scoped to the current user. Lookups by id add `userId: user.id` to the `where`; for example, `update`/`delete` with `{ id, userId }` fails if the row belongs to someone else. `Subcategory` has no `userId`, so it is scoped through its parent with `category: { userId }`. `createTransaction`/`updateTransaction` also verify the target account and call `assertCategoryOwnership` for the category and subcategory ids sent by the client.
- **Account balance is denormalized.** `Account.balance` is stored, not computed. Every action that creates, updates or deletes transactions also adjusts the balance inside the same `db.$transaction`. The places that do this are `createTransaction`, `updateTransaction`, `bulkCreateTransactions`, `bulkDeleteTransactions`, `deleteCategory`/`deleteSubcategory` (which cascade-delete transactions), `createTransfer`/`updateTransfer` and the Inngest recurring processor. Any new mutation path must do the same. Use `increment` (never write an absolute balance read earlier), and sum several amounts as Decimals or with big.js, never as JS floats.
- **Decimal serialization.** Prisma `Decimal` fields (`amount`, `balance`, the transfer's `fromAmount`, `fee`, `rate`, `toAmount`, and `ExchangeRate.rate`) must be converted with `.toNumber()` before they are returned to client components, including nested ones such as `transaction.transfer` on the account page. Each action file has its own small `serializeTransaction`/`serializeAmount`/`serializeTransfer` helper.
- **Explicit fields.** `createAccount`, `createTransaction` and `updateTransaction` build the Prisma `data` from a list of allowed fields (`transactionFields`). Never spread the client's object into Prisma, or a client could set `transferId`, `id` and so on.
- **Error handling is inconsistent.** Some actions throw (which `useFetch` turns into a toast) and others return `{ success: false, error }`. Check how a caller consumes an action before changing which style it uses.
- After mutations, actions call `revalidatePath("/dashboard")`, `revalidatePath("/account/<id>")`, etc. These paths are written without the locale prefix.
- Zod schemas shared by client forms and actions are in `app/lib/schema.js`.

### Database (`prisma/schema.prisma`)
- The Prisma client is generated to `generated/prisma/` **and committed**. Import it from `@/generated/prisma/client`. Use the `db` singleton from `lib/prisma.ts`, which wraps a `pg` Pool through `@prisma/adapter-pg`. SSL is disabled only when `NODE_ENV=development`.
- Models: User, Account (`CURRENT` or `SAVINGS`, one `isDefault` per user, a 3-letter `currency`), Transaction (optional `transferId`), Transfer (internal transfers), Budget (one per user, with a `currency`), Category (typed `INCOME` or `EXPENSE`, with a hex `color` and an optional `systemKey`), Subcategory, Feedback and ExchangeRate (ECB reference rates, shared by every user, so it has no `userId`).
- Naming quirks: `Subcategory.category_id` and `Feedback.created_at`/`updated_at` are snake_case, while everything else is camelCase.
- The migration history matches the schema. `feedbacks` (with row-level security) and the `categories.userId` column were first made outside Prisma; the `add_feedbacks` and `sync_categories_with_schema` migrations recreate them, so a reset rebuilds everything.
- CHECK constraints exist only in migration SQL, because Prisma can't express them: transfer values, currency format and transfer transactions never recurring in `multicurrency_transfers`, and positive rates, currency format and no EUR rows in `add_exchange_rates`. Name new ones `<table>_<what>_chk`. **Never use `prisma db push`.** `Transfer` → `Account` is `onDelete: NoAction`, so deleting an account with transfers must go through an action that reverts the other account's side first.
- The budget is per user, but `getCurrentBudget(accountId)` sums only the default account's expenses for the current month, without transfers but with their fees.

### Recurring transactions (Inngest)
`app/api/inngest/route.js` serves the functions in `lib/inngest/functions.js`. `triggerRecurringTransactions` runs as a daily cron (`0 0 * * *`): it finds due recurring transactions and fans out `transaction.recurring.process` events. `processRecurringTransaction` handles each event (throttled per user): it creates a non-recurring copy, updates the account balance and advances `nextRecurringDate`. `calculateNextRecurringDate` is duplicated in `actions/transaction.js` and in `lib/inngest/functions.js`, so keep the two copies in sync. The `CUSTOM` interval exists in the enum, but the zod schema and the date math don't handle it.

### Exchange rates (`lib/fx/`)
- `exchange_rates` holds the ECB's euro reference rates: one row per working day and currency, in units of the currency per 1 EUR. EUR itself is never stored (`RATE_BASE_CURRENCY`), and only the Inngest job writes rows.
- `fetchExchangeRates` (`lib/inngest/functions.js`) runs daily at 17:00 Europe/Berlin, because the ECB publishes around 16:00 CET. Each run downloads the ECB's 90-day file (`lib/fx/sources.js`) and inserts only the missing rows (`saveRates`, `createMany` with `skipDuplicates`), so reruns are harmless and missed days fill in by themselves. Once the ECB step has used up its retries, the job falls back to Frankfurter, which serves the same ECB numbers. It ends with a `NonRetriableError` when any currency's newest rate is missing or more than 5 days old.
- Lookups follow `lib/fx/convert.js`. The rate on a date is the latest row on or before it, so weekends use Friday's. A cross rate is rate(to) / rate(from), kept at 10 decimals.
- Rate dates travel as `"YYYY-MM-DD"` strings. In the browser, parse them with date-fns `parseISO`, never `new Date(...)`, which reads them as UTC midnight and shows the previous day west of Greenwich.
- Converted views use `lib/fx/report.js`, always in the default account's currency (`resolveReportingCurrency`; there's no setting):
  - `withReportingAmounts` adds `reportingAmount` (rounded per transaction) and `rateMissing` to each transaction. It converts at the rate of the transaction's own day, `rateDateOf`: the UTC date of `date` + 12 hours, because the forms save local midnight, which is the evening before in UTC east of Greenwich.
  - `convertBalances` adds up balances at the newest rates, rounding once at the end.
- Where the rates show up:
  - The analytics "All accounts" option (`getAnalyticsData`). It's hidden before the first rates arrive when the accounts use more than one currency. Transactions without a rate are left out, with a notice.
  - The dashboard's total across accounts (`getTotalBalance`, two accounts or more).
  - The transfer form hint (`getReferenceRate` in `actions/exchange-rates.js`).
- The rates are only a reference. Never write a converted amount into `transactions`, `accounts` or `budgets`, and a transfer keeps the rate the user typed. A budget across currencies is planned but postponed (`../SDD/exchange-rates-and-cross-currency-reporting/`).

### CSV import
CSV parsing runs on the client in `transaction-form.jsx` with papaparse. It expects the columns `Transaction Date` (`dd.MM.yyyy`), `Note`, `Transaction Category` and `Booked amount` (European format such as `-1 500,50`; the sign decides whether the row is income or expense). Amounts are taken as the account's currency. An optional `Currency` column skips the rows in another currency and reports how many it skipped. `bulkCreateTransactions` then creates any missing categories by name and type, with a random color, and never matches a transfer category.

### i18n (next-intl)
- Locales are set in `i18n/routing.js`: `en` (default), `es` and `cs`. Messages live in `messages/<locale>.json`, grouped by namespace (`Dashboard`, `TransactionForm`, `Account`, `Analytics`, `Common`, ...). **Add every new key to all three files.**
- Server components use `getTranslations('<Namespace>')` and client components use `useTranslations`.
- Import `Link`, `useRouter`, `usePathname` and `redirect` from **`@/i18n/navigation`**, not from `next/link`, `next/navigation` or `@/i18n/routing`.
- date-fns locale mapping is only `es` to `es`, with everything else falling back to `enUS`. Money uses `Intl` through `formatMoney` with the app locale.
- Built-in category names live in the `SystemCategories` namespace and the transfer form's texts in `Transfer`. `messages/en.json` uses 2-space indentation, while `es.json` and `cs.json` use 4 spaces. All three use CRLF and have no final newline.
- `components/language-switcher.jsx` hard-codes its locale options, so update it whenever `routing.locales` changes. German was removed to fit the bundle limit.

### Middleware bundle size
The Vercel free plan limits Edge middleware size, and several commits have been spent shrinking it. Arcjet was moved out of `middleware.ts` into the root layout, and the next-intl navigation helpers were split from `i18n/routing.js` into `i18n/navigation.js` so the middleware imports only `defineRouting`. Keep `middleware.ts` and `i18n/routing.js` minimal, and check with `ANALYZE=true` before adding imports there.

### Styling
Tailwind v4 is configured CSS-first in `app/globals.css` (`@import "tailwindcss"`, `@theme inline`, CSS variables, and the custom `.gradient-title` utility) through `@tailwindcss/postcss`. `tailwind.config.js` is a leftover v3-style file: it is not loaded, because there is no `@config` directive. shadcn/ui uses the "new-york" style with JSX (`components.json`, `tsx: false`), so add primitives with `npx shadcn@latest add <component>`. The sphere background on the landing and `(main)` pages comes from `components/FinisherHeader.jsx`, which drives the vendored, hand-edited `public/finisher-header.es5.min.js`. It is static for performance (`"animate": false` in `defaultConfig`); set it to `true` to animate the spheres again.

Path alias: `@/*` maps to the repo root (`jsconfig.json`).
