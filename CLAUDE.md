# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Trakeo is a personal finance tracker: multiple accounts, income/expense transactions with user-defined colored categories and subcategories, recurring transactions, CSV bulk import, a monthly budget bar, an analytics view, and a feedback button. It is deployed on Vercel's **free plan**, and that size limit has shaped some of the code (see "Middleware bundle size").

Stack: Next.js 16 App Router (React 19, mostly plain JS: `.js`/`.jsx`, with only `middleware.ts`, `lib/prisma.ts` and `prisma.config.ts` in TS), Clerk auth, Prisma 7 on PostgreSQL, Inngest background jobs, next-intl i18n, Arcjet bot protection, Tailwind CSS v4 with shadcn/ui, react-hook-form with zod, and recharts.

## Commands

```bash
npm install                      # also runs `prisma generate` (postinstall)
npm run dev                      # Next dev server on http://localhost:3000
npx inngest-cli@latest dev       # run alongside `dev`; needed for recurring transactions locally
npm run build && npm start
npm run lint                     # ESLint flat config (eslint-config-next core-web-vitals)
npx eslint <path>                # lint a single file

# Bundle analysis (opens analyzer reports after build)
ANALYZE=true npm run build                      # bash
$env:ANALYZE='true'; npm run build              # PowerShell

# Prisma (config in prisma.config.ts; reads DATABASE_URL from .env via dotenv)
npx prisma migrate dev --name <name>
npx prisma generate
npx prisma studio
```

There is no test framework or test suite. `test-date.js` is a scratch Node script (`node test-date.js`) for checking the CSV date and amount parsing rules.

Required env vars (in `.env`, which is gitignored): `DATABASE_URL`, `ARCJET_KEY`, plus the standard Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).

## Architecture

### Request flow and routing
- Every page lives under `app/[locale]/`. Route groups: `(auth)` for the Clerk sign-in/sign-up catch-all pages and `(main)` for the app pages `dashboard`, `account/[id]`, `transaction/create` and `analytics`. Route-private components sit in sibling `_components/` folders, and shared ones in `components/` (shadcn primitives in `components/ui/`).
- `middleware.ts` chains Clerk and next-intl. Protected routes are listed explicitly in `isProtectedRoute`, in both the plain and `/:locale/` forms, so **a new protected page must be added there in both forms**. `/api/*` skips the intl middleware.
- The root `app/[locale]/layout.js` runs Arcjet (`aj.protect`, shield + bot detection) on every page render and calls `notFound()` when a request is denied. `createTransaction` also calls `aj.protect` and still checks `isRateLimit()`, but the token-bucket rule was removed, so no rate limit is configured. The root layout also mounts `ClerkProvider`, `NextIntlClientProvider`, `Header`, `Toaster` and `FeedbackButton`.
- `app/[locale]/(main)/dashboard/layout.js` imports and renders `DashboardPage` directly inside `<Suspense>` and ignores `children`.

### Data layer: server actions in `actions/`
Server components fetch data by calling server actions directly (`getUserAccounts`, `getDashboardData`, `getCategories`, ...), and client components call mutations through the `useFetch` hook (`hooks/use-fetch.jsx`). That hook wraps an action, tracks `loading`/`data`/`error`, and shows a sonner toast when the action throws. Client components then watch `data?.success` in a `useEffect` to show a success toast or navigate.

Conventions that span multiple files:
- **Users.** Clerk's user id maps to `User.clerkUserId`, and actions use the DB `user.id` for every query. Most actions do `auth()` followed by `db.user.findUnique({ where: { clerkUserId } })`. `lib/checkUser.js` does the same lookup but also **creates the DB user on first visit** with two default categories, "Other Expenses" and "Other Income". It is called from `Header` on every render, which is how users get created. The transaction form picks its default category by the name "Other Expenses".
- **Scoping.** Every query and mutation is scoped to the current user. Lookups by id add `userId: user.id` to the `where`; for example, `update`/`delete` with `{ id, userId }` fails if the row belongs to someone else. `Subcategory` has no `userId`, so it is scoped through its parent with `category: { userId }`. `createTransaction`/`updateTransaction` also verify the target account and call `assertCategoryOwnership` for the category and subcategory ids sent by the client.
- **Account balance is denormalized.** `Account.balance` is stored, not computed. Every action that creates, updates or deletes transactions also adjusts the balance inside the same `db.$transaction`. The places that do this are `createTransaction`, `updateTransaction`, `bulkCreateTransactions`, `bulkDeleteTransactions`, `deleteCategory`/`deleteSubcategory` (which cascade-delete transactions) and the Inngest recurring processor. Any new mutation path must do the same.
- **Decimal serialization.** Prisma `Decimal` fields (`amount`, `balance`) must be converted with `.toNumber()` before they are returned to client components. Each action file has its own small `serializeTransaction`/`serializeAmount` helper.
- **Error handling is inconsistent.** Some actions throw (which `useFetch` turns into a toast) and others return `{ success: false, error }`. Check how a caller consumes an action before changing which style it uses.
- After mutations, actions call `revalidatePath("/dashboard")`, `revalidatePath("/account/<id>")`, etc. These paths are written without the locale prefix.
- Zod schemas shared by client forms and actions are in `app/lib/schema.js`.

### Database (`prisma/schema.prisma`)
- The Prisma client is generated to `generated/prisma/` **and committed**. Import it from `@/generated/prisma/client`. Use the `db` singleton from `lib/prisma.ts`, which wraps a `pg` Pool through `@prisma/adapter-pg`. SSL is disabled only when `NODE_ENV=development`.
- Models: User, Account (`CURRENT` or `SAVINGS`, one `isDefault` per user), Transaction, Budget (one per user), Category (typed `INCOME` or `EXPENSE`, with a hex `color`), Subcategory and Feedback.
- Naming quirks: `Subcategory.category_id` and `Feedback.created_at`/`updated_at` are snake_case, while everything else is camelCase.
- The `feedbacks` table has no migration. It was created directly in the database with row-level security, so `prisma migrate dev` may report drift.
- The budget is per user, but `getCurrentBudget(accountId)` sums only the default account's expenses for the current month.

### Recurring transactions (Inngest)
`app/api/inngest/route.js` serves the functions in `lib/inngest/functions.js`. `triggerRecurringTransactions` runs as a daily cron (`0 0 * * *`): it finds due recurring transactions and fans out `transaction.recurring.process` events. `processRecurringTransaction` handles each event (throttled per user): it creates a non-recurring copy, updates the account balance and advances `nextRecurringDate`. `calculateNextRecurringDate` is duplicated in `actions/transaction.js` and in `lib/inngest/functions.js`, so keep the two copies in sync. The `CUSTOM` interval exists in the enum, but the zod schema and the date math don't handle it.

### CSV import
CSV parsing runs on the client in `transaction-form.jsx` with papaparse. It expects the columns `Transaction Date` (`dd.MM.yyyy`), `Note`, `Transaction Category` and `Booked amount` (European format such as `-1 500,50`; the sign decides whether the row is income or expense). `bulkCreateTransactions` then creates any missing categories by name and type, with a random color.

### i18n (next-intl)
- Locales are set in `i18n/routing.js`: `en` (default), `es` and `cs`. Messages live in `messages/<locale>.json`, grouped by namespace (`Dashboard`, `TransactionForm`, `Account`, `Analytics`, `Common`, ...). **Add every new key to all three files.**
- Server components use `getTranslations('<Namespace>')` and client components use `useTranslations`.
- Import `Link`, `useRouter`, `usePathname` and `redirect` from **`@/i18n/navigation`**, not from `next/link`, `next/navigation` or `@/i18n/routing`.
- date-fns locale mapping is only `es` to `es`, with everything else falling back to `enUS`. The currency is hard-coded as `€`.
- `components/language-switcher.jsx` hard-codes its locale options, so update it whenever `routing.locales` changes. German was removed to fit the bundle limit.

### Middleware bundle size
The Vercel free plan limits Edge middleware size, and several commits have been spent shrinking it. Arcjet was moved out of `middleware.ts` into the root layout, and the next-intl navigation helpers were split from `i18n/routing.js` into `i18n/navigation.js` so the middleware imports only `defineRouting`. Keep `middleware.ts` and `i18n/routing.js` minimal, and check with `ANALYZE=true` before adding imports there.

### Styling
Tailwind v4 is configured CSS-first in `app/globals.css` (`@import "tailwindcss"`, `@theme inline`, CSS variables, and the custom `.gradient-title` utility) through `@tailwindcss/postcss`. `tailwind.config.js` is a leftover v3-style file: it is not loaded, because there is no `@config` directive. shadcn/ui uses the "new-york" style with JSX (`components.json`, `tsx: false`), so add primitives with `npx shadcn@latest add <component>`. The animated background on the landing and `(main)` pages comes from `components/FinisherHeader.jsx`.

Path alias: `@/*` maps to the repo root (`jsconfig.json`).
