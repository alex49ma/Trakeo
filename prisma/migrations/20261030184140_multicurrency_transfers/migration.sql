-- CreateEnum
CREATE TYPE "SystemCategory" AS ENUM ('OTHER_EXPENSES', 'OTHER_INCOME', 'TRANSFER_OUT', 'TRANSFER_IN', 'TRANSFER_FEE');

-- CreateEnum
CREATE TYPE "ExchangeField" AS ENUM ('FROM_AMOUNT', 'RATE', 'TO_AMOUNT');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "transferId" TEXT;

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "systemKey" "SystemCategory";

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "fromAmount" DECIMAL(65,30) NOT NULL,
    "fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "rate" DECIMAL(20,10) NOT NULL,
    "toAmount" DECIMAL(65,30) NOT NULL,
    "derivedField" "ExchangeField" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transfers_userId_idx" ON "transfers"("userId");

-- CreateIndex
CREATE INDEX "transfers_fromAccountId_idx" ON "transfers"("fromAccountId");

-- CreateIndex
CREATE INDEX "transfers_toAccountId_idx" ON "transfers"("toAccountId");

-- CreateIndex
CREATE INDEX "transactions_transferId_idx" ON "transactions"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_systemKey_key" ON "categories"("userId", "systemKey");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;


-- Checks Prisma can't express in the schema. They only live here, so never use `prisma db push`.

-- Transfer transactions are never recurring
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_not_recurring_chk"
  CHECK ("transferId" IS NULL OR "isRecurring" = false);

ALTER TABLE "transfers" ADD CONSTRAINT "transfers_values_chk"
  CHECK ("fromAccountId" <> "toAccountId"
         AND "fromAmount" > 0 AND "toAmount" > 0 AND "rate" > 0
         AND "fee" >= 0 AND "fee" < "fromAmount");

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_currency_format_chk" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "budgets"  ADD CONSTRAINT "budgets_currency_format_chk"  CHECK ("currency" ~ '^[A-Z]{3}$');
