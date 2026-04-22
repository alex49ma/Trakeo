import { Inter } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { FeedbackButton } from "@/components/feedback-button";
import { request } from '@arcjet/next';
import { aj } from '@/lib/arcjet';
import { notFound } from 'next/navigation';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Trakeo",
  description: "The new expense tracking app",
};

export default async function RootLayout({ children, params }) {
  const req = await request();
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    notFound();
  }

  const { locale } = await params;
  const messages = await getMessages();
  const t = await getTranslations('Footer');

  return (
    <ClerkProvider>
      <html lang={locale}>
        <body className={`${inter.className} flex flex-col min-h-screen`}>
          <NextIntlClientProvider messages={messages}>
            {/* Header */}
            <Header />
            <main className="flex-1 w-full flex flex-col">
              {children}
            </main>
            <Toaster richColors />
            <FeedbackButton />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
