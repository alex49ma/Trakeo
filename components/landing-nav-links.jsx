"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";

const LINKS = [
    { href: "#month", key: "month" },
    { href: "#who", key: "who" },
    { href: "#faq", key: "faq" },
];

// Jumps to the landing page's sections. The header renders this for signed-out visitors, and it only shows on the
// landing page itself, from lg (below that the header has no room for it)
export default function LandingNavLinks() {
    const pathname = usePathname();
    const t = useTranslations("Header.landingLinks");

    if (pathname !== "/") return null;

    return (
        <div className="mr-3 hidden items-center gap-7 text-[14px] font-medium text-neutral-700 lg:flex">
            {LINKS.map(({ href, key }) => (
                <a
                    key={key}
                    href={href}
                    className="rounded-sm hover:text-orange-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700"
                >
                    {t(key)}
                </a>
            ))}
        </div>
    );
}
