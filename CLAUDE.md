# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Trakeo is a personal finance tracker: multiple accounts, each in one currency (EUR, CZK, USD, GBP, PLN or CHF), income/expense transactions with user-defined colored categories and subcategories, internal transfers between accounts (with currency exchange when the currencies differ), recurring transactions, CSV bulk import, a monthly budget bar, an analytics view, daily ECB exchange rates (a reference in the transfer form, plus converted totals in analytics and on the dashboard), and a feedback button. It is deployed on Vercel's **free plan**, and that has shaped some of the code (see "Proxy and bundle size").

Stack: Next.js 16 App Router (React 19, mostly plain JS: `.js`/`.jsx`, with only `proxy.ts`, `lib/prisma.ts` and `prisma.config.ts` in TS), Better Auth (email + password and Google; replacing Clerk, see "Authentication"), Prisma 7 on PostgreSQL, Inngest background jobs, next-intl i18n, Arcjet bot protection, Tailwind CSS v4 with shadcn/ui, react-hook-form with zod, and recharts.

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

There is no test framework or test suite yet (Vitest is planned). `lib/csv-import/` is all pure functions and the obvious first target for it. Design documents and manual test plans live in `../SDD/`, next to the repo, one folder per feature:
- Multi-currency accounts and internal transfers: `../SDD/multicurrency_specs/` (`multicurrency-accounts-and-exchanges-migration-plan.md`, `multicurrency-test-plan.md`).
- Daily exchange rates and cross-currency reporting: `../SDD/exchange-rates-and-cross-currency-reporting/` (`exchange-rates-and-cross-currency-reporting-plan.md`, `exchange-rates-test-plan.md`).
- CSV import for any bank: `../SDD/csv-import/` (`csv-import-plan.md`).
- From Clerk to Better Auth: `../SDD/better-auth-migration/` (`better-auth-migration-plan.md`). Its section 2 is the decision log (D1, D2, …) that code comments refer to.

Required env vars (in `.env`, which is gitignored): `DATABASE_URL`, `ARCJET_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (`http://localhost:3000` locally), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (without it, development logs emails and their links instead of sending them) and `EMAIL_FROM`. The Clerk keys are unused and go away when the migration ends.

## Architecture

### Request flow and routing
- Every page lives under `app/[locale]/`. Route groups: `(auth)` for `sign-in`, `sign-up`, `forgot-password`, `reset-password` and `verify-email`, and `(main)` for the app pages `dashboard`, `accounts`, `account/[id]`, `transaction/create`, `transaction/transfer` (internal transfers; `?from=<accountId>` preselects the source, `?edit=<transferId>` edits), `transaction/import` (CSV import; `?account=<accountId>` preselects the account) and `analytics`. `privacy` is public and outside both groups. Route-private components sit in sibling `_components/` folders, and shared ones in `components/` (shadcn primitives in `components/ui/`).
- `proxy.ts` (Next 16's name for middleware) runs next-intl and redirects signed-out visitors of protected pages to `/<locale>/sign-in?redirect=<path>`. Protected pages are the path prefixes in `PROTECTED_PATHS`, written without the locale, so **a new protected page must be added there**. The proxy only checks that a session cookie exists; the real checks are `getCurrentUser()` in the `(main)` layout and `requireUser()` in every action. `/api/*` skips the proxy's logic.
- The root `app/[locale]/layout.js` runs Arcjet (`aj.protect`, shield + bot detection) on every page render and calls `notFound()` when a request is denied. `createTransaction` also calls `aj.protect` and still checks `isRateLimit()`, but the token-bucket rule was removed, so no rate limit is configured. The root layout also mounts `NextIntlClientProvider`, `Header`, `Toaster` and `FeedbackButton`.
- `app/[locale]/(main)/dashboard/layout.js` imports and renders `DashboardPage` directly inside `<Suspense>` and ignores `children`.

### Data layer: server actions in `actions/`
Server components fetch data by calling server actions directly (`getUserAccounts`, `getDashboardData`, `getCategories`, ...), and client components call mutations through the `useFetch` hook (`hooks/use-fetch.jsx`). That hook wraps an action, tracks `loading`/`data`/`error`, and shows a sonner toast when the action throws. Client components then watch `data?.success` in a `useEffect` to show a success toast or navigate.

Conventions that span multiple files:
- **Users.** Actions and pages get the signed-in user from `lib/auth.js`: `requireUser()` (throws `"Unauthorized"`) or `getCurrentUser()` (null instead, for optional users such as feedback). Both return the session's user (`id`, `name`, `email`, `emailVerified`, `image`, `locale`), cached per request; query `users` for anything else or anything that must be fresh. Never read Better Auth's session another way on the server. Arcjet's `aj.protect` gets `userId: user.id`. Users are created by Better Auth at sign-up, and a hook adds the five built-in categories (see "Authentication"). The transaction form picks its default category by `systemKey: "OTHER_EXPENSES"`.
- **Built-in categories.** `Category.systemKey` marks five locked categories per user, defined in `lib/system-categories.js`: `OTHER_EXPENSES` and `OTHER_INCOME` (usable by normal transactions, subcategories allowed), and `TRANSFER_OUT`, `TRANSFER_IN` and `TRANSFER_FEE` (reserved for transfer transactions, no subcategories). Find them by `systemKey`, never by name. `deleteCategory` refuses them and `updateCategory` changes only their color (defaults, all different, in `SYSTEM_CATEGORIES`; the categories card can reset to them), `createSubcategory` and `assertCategoryOwnership` refuse the transfer ones, and CSV matching skips the transfer ones. Show names with `categoryLabel(category, t)` (namespace `SystemCategories`), because built-in names are translated by key.
- **Currencies.** `Account.currency` is set when the account is created and never changes. Every amount is in its account's currency, and transactions store no currency. Format money with `formatMoney(amount, currency, locale)` from `lib/currency.js`, never with a hard-coded `€`. Never add amounts from accounts in different currencies directly: convert them first with `lib/fx/report.js` (see "Exchange rates"). Analytics also offers one group per currency, and `Budget.currency` follows the default account (with a notice when they differ).
- **Internal transfers** (`actions/transfer.js`). A `Transfer` row plus 2–3 normal transactions linked by `transferId`: outgoing (`TRANSFER_OUT`, EXPENSE) and an optional fee (`TRANSFER_FEE`, EXPENSE) in the source account, and incoming (`TRANSFER_IN`, INCOME) in the destination. `fromAmount` includes the fee: `toAmount = (fromAmount - fee) * rate`, and the rate is fixed at 1 between accounts in the same currency. `resolveExchange` in `lib/exchange.js` (big.js, exact decimals) is shared by the form and the actions, and the server always recalculates the derived value. Transfers are edited only as a whole: `updateTransaction` refuses transfer transactions, and `bulkDeleteTransactions` expands any selected transfer transaction to the whole transfer. Charts, pies and the budget leave out the two transfer-direction categories with `countsInTotals` (client) or `COUNTS_IN_TOTALS_CATEGORY` (Prisma); fees still count. Don't filter a nullable column like `systemKey` with `notIn`/`not`, because SQL also drops the NULL rows. `updateTransaction` also refuses moving a transaction to an account in another currency.
- **Scoping.** Every query and mutation is scoped to the current user. Lookups by id add `userId: user.id` to the `where`; for example, `update`/`delete` with `{ id, userId }` fails if the row belongs to someone else. `Subcategory` has no `userId`, so it is scoped through its parent with `category: { userId }`. `createTransaction`/`updateTransaction` also verify the target account and call `assertCategoryOwnership` for the category and subcategory ids sent by the client.
- **Account balance is denormalized.** `Account.balance` is stored, not computed. Every action that creates, updates or deletes transactions also adjusts the balance inside the same `db.$transaction`. The places that do this are `createTransaction`, `updateTransaction`, `importTransactions`, `bulkDeleteTransactions`, `deleteCategory`/`deleteSubcategory` (which cascade-delete transactions), `createTransfer`/`updateTransfer` and the Inngest recurring processor. Any new mutation path must do the same. Use `increment` (never write an absolute balance read earlier), and sum several amounts as Decimals or with big.js, never as JS floats.
- **Decimal serialization.** Prisma `Decimal` fields (`amount`, `balance`, the transfer's `fromAmount`, `fee`, `rate`, `toAmount`, and `ExchangeRate.rate`) must be converted with `.toNumber()` before they are returned to client components, including nested ones such as `transaction.transfer` on the account page. Each action file has its own small `serializeTransaction`/`serializeAmount`/`serializeTransfer` helper.
- **Explicit fields.** `createAccount`, `createTransaction` and `updateTransaction` (through `transactionFields`) and `importTransactions` build the Prisma `data` from a list of allowed fields. Never spread the client's object into Prisma, or a client could set `transferId`, `id` and so on.
- **Error handling is inconsistent.** Some actions throw (which `useFetch` turns into a toast) and others return `{ success: false, error }`. Check how a caller consumes an action before changing which style it uses.
- After mutations, actions call `revalidatePath("/dashboard")`, `revalidatePath("/account/<id>")`, etc. These paths are written without the locale prefix.
- Zod schemas shared by client forms and actions are in `app/lib/schema.js`.

### Database (`prisma/schema.prisma`)
- The Prisma client is generated to `generated/prisma/` **and committed**. Import it from `@/generated/prisma/client`. Use the `db` singleton from `lib/prisma.ts`, which wraps a `pg` Pool through `@prisma/adapter-pg`. SSL is disabled only when `NODE_ENV=development`.
- Models: User, Account (`CURRENT` or `SAVINGS`, one `isDefault` per user, a 3-letter `currency`), Transaction (optional `transferId`), Transfer (internal transfers), Budget (one per user, with a `currency`), Category (typed `INCOME` or `EXPENSE`, with a hex `color` and an optional `systemKey`), Subcategory, Feedback, ExchangeRate (ECB reference rates, shared by every user, so it has no `userId`) and ImportProfile (saved CSV import settings, unique per user and `headerSignature`, with the mapping in a JSON `settings` column validated by `importSettingsSchema`). Better Auth's tables: Session, AuthAccount (one row per sign-in method; Better Auth calls it `account`, renamed because Account is a bank account), Verification and RateLimit. Their fields must match Better Auth's core schema, which the adapter checks at startup, and they have row-level security on without policies, so Supabase's Data API can't read them. `User.clerkUserId` only links users imported from Clerk and will be dropped.
- Naming quirks: `Subcategory.category_id` and `Feedback.created_at`/`updated_at` are snake_case, while everything else is camelCase.
- The migration history matches the schema. `feedbacks` (with row-level security) and the `categories.userId` column were first made outside Prisma; the `add_feedbacks` and `sync_categories_with_schema` migrations recreate them, so a reset rebuilds everything.
- CHECK constraints exist only in migration SQL, because Prisma can't express them: transfer values, currency format and transfer transactions never recurring in `multicurrency_transfers`, and positive rates, currency format and no EUR rows in `add_exchange_rates`. Name new ones `<table>_<what>_chk`. **Never use `prisma db push`.** `Transfer` → `Account` is `onDelete: NoAction`, so deleting an account with transfers must go through an action that reverts the other account's side first.
- The budget is per user, but `getCurrentBudget(accountId)` sums only the default account's expenses for the current month, without transfers but with their fees.

### Recurring transactions (Inngest)
`app/api/inngest/route.js` serves the functions in `lib/inngest/functions.js`. `triggerRecurringTransactions` runs as a daily cron (`0 0 * * *`): it finds due recurring transactions and fans out `transaction.recurring.process` events. `processRecurringTransaction` handles each event (throttled per user): it advances `nextRecurringDate` with a conditional `updateMany` (so a duplicate event books nothing), creates a non-recurring copy dated on the due date and updates the account balance. A transaction is due only once `nextRecurringDate` has passed, because the original covers its own period. The schedule advances from the due date, not the run date, and occurrences missed by runs that never happened are skipped. The date math lives in `lib/recurring.js` (date-fns, so month ends clamp), shared by the job and the actions. `updateTransaction` keeps `nextRecurringDate` unless the date, interval or recurring flag changes, and then restarts it at the next future occurrence. The `CUSTOM` interval exists in the enum, but the zod schema and the date math don't handle it.

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
A four-step wizard at `/transaction/import` (`transaction/import/_components/import-wizard.jsx`): file and account, columns, categories, preview. It reads any bank's CSV once the user maps the columns, and **nothing is saved before "Import" in the last step**. Plan and decisions: `../SDD/csv-import/csv-import-plan.md`.
- The file never leaves the browser. `lib/csv-import/` holds the pure parsing functions (no React): `decode.js` (UTF-8, falling back to Windows-1250 in Czech and Windows-1252 otherwise), `table.js` (papaparse, its own delimiter guess, header-row detection that skips bank preambles), `parse.js` (amounts as decimal strings, never floats; date formats with a regex check before date-fns), `guess.js` (column guesses from header words and values), `rows.js` (one status per row, and the category groups), `keys.js` (`normalizeName`, `groupKey`), `duplicates.js` and `limits.js`.
- The wizard derives everything with `useMemo` from the file, the mapping and the choices (`_components/choices.js`). A mapping edit is kept only while the columns stay the same (`signature`).
- An optional Fee column is subtracted from each row's amount (banks charge fees on top).
- Categories are chosen per group (the same value in the "Group by" column; for a description column, numbers are ignored). A row with a blank "Group by" cell is a group of its own. Phase 1 makes no category suggestions: a group starts with no category, and its rows go to the built-in Other Expenses / Other Income. `category-picker.jsx` reuses `CreateCategoryDrawer` and `CreateSubcategoryDrawer`, so a category created during an import is saved right away, as in the transaction form.
- In the preview, every row's date, description, type, amount, category and subcategory can be edited (`rowEdits`, `rowChoices`). An edited type drops a category of the other type.
- **Possible duplicates:** a row with the same day (`rateDateOf`), type and amount as an existing transaction of the account. Each existing transaction matches one row at most. They start unticked, and the preview points them out. `getImportContext` returns the account's transactions around the file's dates for this check.
- `importTransactions` (`actions/import.js`) validates the rows with `importSchema` (at most `IMPORT_MAX_ROWS` = 500), checks each category and subcategory (the user's, not a transfer one, same type as the row), and creates the transactions and the balance change in one `db.$transaction`. Expected problems come back as `{ success: false, error }`, with `error` a key of `CsvImport.errors`.
- **Saved settings** (`ImportProfile`, `lib/csv-import/signature.js`): the encoding, separator and mapping of a bank's CSV, with columns saved by header name (or `#3` for an unnamed one). When a file is loaded, `findSavedSettings` looks for a row in its first lines whose `headerSignature` (names under `normalizeName`, joined with `|`) matches; a match sets up the columns, can preselect the account they were last used with (never one chosen in the URL or by hand), and skips step 2. Settings whose columns all exist in a file are offered in step 2. They're saved by `importTransactions` when its request has a `profile`, **after** the import's transaction, so a failed save never undoes an import (`profileSaved: false`). Rename and delete scope by `{ id, userId }`. Category choices aren't saved yet (phase 2b).

### i18n (next-intl)
- Locales are set in `i18n/routing.js`: `en` (default), `es` and `cs`. Messages live in `messages/<locale>.json`, grouped by namespace (`Dashboard`, `TransactionForm`, `Account`, `Analytics`, `Common`, ...). **Add every new key to all three files.**
- Server components use `getTranslations('<Namespace>')` and client components use `useTranslations`.
- Import `Link`, `useRouter`, `usePathname` and `redirect` from **`@/i18n/navigation`**, not from `next/link`, `next/navigation` or `@/i18n/routing`.
- date-fns locale mapping is only `es` to `es`, with everything else falling back to `enUS`. Money uses `Intl` through `formatMoney` with the app locale.
- Built-in category names live in the `SystemCategories` namespace and the transfer form's texts in `Transfer`. The auth pages use `Auth` (with `Auth.errors.<code>` for Better Auth's error codes and `Auth.validation.<key>` for the zod messages of the auth schemas, which are keys), the auth emails `Emails`, the header's avatar menu `UserMenu`, and the privacy page `Privacy`. `messages/en.json` uses 2-space indentation, while `es.json` and `cs.json` use 4 spaces. All three use CRLF and have no final newline.
- `components/language-switcher.jsx` hard-codes its locale options, so update it whenever `routing.locales` changes. German was removed to fit the bundle limit.

### Authentication (Better Auth)
Clerk is being replaced, in phases (`../SDD/better-auth-migration/`). Until the switch, Clerk users have no way to sign in on this branch: they're imported in phase 4.
- `lib/better-auth.js` is the config (Prisma adapter, email + password, Google, sessions, emails, rate limits, hooks); each option is commented with its decision ID. `app/api/auth/[...all]/route.js` serves it, with Arcjet in front of every POST. `lib/auth-client.js` is the browser client, plus `callAuth()` (adds the rate limit's wait time) and `authErrorMessage()`.
- Sign-up requires a confirmed email (Google accounts count as confirmed). Users are created by Better Auth, and the `user.create.after` hook adds the built-in categories with `createSystemCategories` (`lib/user-setup.js`), which is safe to repeat. A user's `locale` (the language of their emails) comes from the page they signed up on.
- Passwords: new ones use Better Auth's scrypt; `lib/password.js` also verifies the bcrypt hashes imported from Clerk.
- Emails go through Resend (`lib/email/`), after the response (`after()`), in the user's language. Their links always come back to our own pages in that language (`withCallback`), whatever the browser asked for.
- Sessions last 7 days, renewed while used. A signed cookie caches the session for 5 minutes, so revoking a session (sign-out elsewhere, password reset) can take up to 5 minutes to reach another device. Server renders never renew sessions (`disableRefresh`); the header's `UserMenu` does, through `useSession()`.
- Signing up with an email that already exists answers like a new sign-up and emails the owner instead, and password reset answers the same for every email, so neither reveals which emails are registered. Keep it that way.
- `?redirect=` values go through `safeRedirect()` (`lib/safe-redirect.js`): only paths inside the app, written without the locale.
- Rate limits only run in production, with counters in the `rate_limits` table.

### Proxy and bundle size
Next 16 runs `proxy.ts` as a Node function, not on the Edge, so the Edge size limit that shaped the old `middleware.ts` no longer applies (it bundles about 1.3 MB, most of it Next's runtime). Arcjet still lives in the root layout and the next-intl navigation helpers in `i18n/navigation.js`, from the Edge days. Keep the proxy to redirects: no database calls, which Better Auth also advises.

### Styling
Tailwind v4 is configured CSS-first in `app/globals.css` (`@import "tailwindcss"`, `@theme inline`, CSS variables, and the custom `.gradient-title` utility) through `@tailwindcss/postcss`. `tailwind.config.js` is a leftover v3-style file: it is not loaded, because there is no `@config` directive. shadcn/ui uses the "new-york" style with JSX (`components.json`, `tsx: false`), so add primitives with `npx shadcn@latest add <component>`. The sphere background on the landing and `(main)` pages comes from `components/FinisherHeader.jsx`, which drives the vendored, hand-edited `public/finisher-header.es5.min.js`. It is static for performance (`"animate": false` in `defaultConfig`); set it to `true` to animate the spheres again.

### Landing page
`app/[locale]/page.jsx` stacks the sections in `app/[locale]/_components/` inside `FinisherHeader`.
- Layering: the FinisherHeader canvas is at z-index -1 and the `PaperGrain` texture at 1. Sections, cards and timeline dots use `relative z-10` and the handwritten notes (`HandNote`) z-20, so new content needs `z-10` to sit above the texture. The light bands (`bg-orange-50/90`) stay unpositioned so the texture covers them.
- Kalam (`font-hand`) is only for the handwritten annotations. Margin notes are hidden below md, and `HandNote`'s `from` delays one to lg or xl when it needs more room.
- The mock UI cards are real shadcn components inside `inert`, `aria-hidden` frames. Their sample numbers live in `data/landing.js`, and the `Landing.*` copy describes the same month, so change the two together.
- The page uses `line-height: normal`, so its text sizes are px values (`text-[14px]`) rather than `text-sm`, which brings its own line height. `cn()` (tailwind-merge) drops a `leading-*` that comes before a text size.
- The "Get started" buttons go to `/sign-up`, which sends signed-in visitors on to the dashboard.
- The hero's language line and the FAQ's languages answer name the locales in plain text: update them with `routing.locales`, like the language switcher. Czech landing strings tie one-letter prepositions and conjunctions to the next word with ` `.

Path alias: `@/*` maps to the repo root (`jsconfig.json`).
