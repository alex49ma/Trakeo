import { Inter } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Trakeo",
  description: "The new expense tracking app",
};

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html lang={locale}>
        <body className={`${inter.className}`}>
          <NextIntlClientProvider messages={messages}>
            {/* Header */}
            <Header />
            <main className="min-h-screen">
              {children}
            </main>
            <Toaster richColors />
            {/*Footer */}
            <footer className="bg-orange-100/10 backdrop-blur-xs py-12">
              <div className="container mx-auto px-4 text-center text-gray-800">
                <p>© 2025 Trakeo. All rights reserved.</p>
              </div>
            </footer>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
