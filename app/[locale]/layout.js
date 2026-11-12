import { Inter, Kalam } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import Header from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { FeedbackButton } from "@/components/feedback-button";
import { request } from '@arcjet/next';
import { aj } from '@/lib/arcjet';
import { notFound } from 'next/navigation';

const inter = Inter({ subsets: ["latin"] });
// Handwriting for the landing page's annotations (Tailwind's font-hand). latin-ext has the Czech letters.
// It isn't preloaded because the app pages never use it: the browser downloads it only where text needs it
const kalam = Kalam({ weight: ["400", "700"], subsets: ["latin", "latin-ext"], variable: "--font-kalam", preload: false });

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
    <html lang={locale}>
      <body className={`${inter.className} ${kalam.variable} flex flex-col min-h-screen`}>
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
  );
}
