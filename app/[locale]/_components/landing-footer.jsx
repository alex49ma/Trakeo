import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import Container from "./container";

const LINK = "rounded-sm hover:text-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700";

export default async function LandingFooter() {
    const user = await getCurrentUser();
    const t = await getTranslations("Landing.footer");
    const header = await getTranslations("Header");
    const footer = await getTranslations("Footer");
    const privacy = await getTranslations("Privacy");

    return (
        <footer className="relative z-10 border-t border-neutral-200 bg-white/[0.88]">
            <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 py-7">
                {/* The image has transparent space on its left: -ml-3 lines the logo up with the text */}
                <Image src="/t_panel.png" alt="Trakeo" width={200} height={70} className="-ml-3 h-9 w-auto" />
                <nav aria-label={t("label")} className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-neutral-700">
                    <a href="#month" className={LINK}>
                        {t("month")}
                    </a>
                    <a href="#faq" className={LINK}>
                        {t("faq")}
                    </a>
                    <Link href="/privacy" className={LINK}>
                        {privacy("link")}
                    </Link>
                    {/* The same destinations as the header: sign-in for visitors, the dashboard once signed in */}
                    {user ? (
                        <Link href="/dashboard" className={LINK}>
                            {header("dashboard")}
                        </Link>
                    ) : (
                        <Link href="/sign-in" className={LINK}>
                            {header("login")}
                        </Link>
                    )}
                </nav>
                <p className="text-[14px] text-neutral-600">{footer("copyright")}</p>
            </Container>
        </footer>
    );
}
