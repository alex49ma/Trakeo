import React from 'react'
import FinisherHeader from "@/components/FinisherHeader";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";

// The app pages. The proxy only checks that a session cookie exists; this checks the session itself, so a stale or
// forged cookie ends on the sign-in page. Every action still checks again (requireUser)
const MainLayout = async ({ children }) => {
    if (!(await getCurrentUser())) redirect({ href: "/sign-in", locale: await getLocale() });

    const t = await getTranslations('Footer');
    const privacy = await getTranslations('Privacy');

    return (
        <FinisherHeader className="flex-1 flex flex-col">
            <div className="container mx-auto my-32 flex-grow">{children}</div>
            <footer className="bg-orange-100/10 backdrop-blur-xs py-6 relative z-10 mt-auto">
                <div className="container mx-auto px-4 text-center text-gray-800 space-y-1">
                    <p>{t('copyright')}</p>
                    <p className="text-sm">
                        <Link href="/privacy" className="underline-offset-4 hover:underline">{privacy('link')}</Link>
                    </p>
                </div>
            </footer>
        </FinisherHeader>
    )
}

export default MainLayout
