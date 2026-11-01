-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('ECB', 'FRANKFURTER');

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(20,10) NOT NULL,
    "source" "ExchangeRateSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_currency_date_key" ON "exchange_rates"("currency", "date");


-- Checks Prisma can't express in the schema. They only live here, so never use `prisma db push`.

-- Rates are units of a currency per 1 EUR, so EUR itself is never stored
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_rate_positive_chk" CHECK ("rate" > 0);
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_currency_format_chk" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_not_eur_chk" CHECK ("currency" <> 'EUR');
