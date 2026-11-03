import Image from "next/image";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Container from "./container";

const LINK = "rounded-sm hover:text-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700";

export default function LandingFooter() {
    const t = useTranslations("Landing.footer");
    const header = useTranslations("Header");
    const footer = useTranslations("Footer");

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
                    {/* The same sign-in as the header's Login button */}
                    <SignedOut>
                        <SignInButton forceRedirectUrl="/dashboard">
                            <button type="button" className={`${LINK} cursor-pointer`}>
                                {header("login")}
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <Link href="/dashboard" className={LINK}>
                            {header("dashboard")}
                        </Link>
                    </SignedIn>
                </nav>
                <p className="text-[14px] text-neutral-600">{footer("copyright")}</p>
            </Container>
        </footer>
    );
}
