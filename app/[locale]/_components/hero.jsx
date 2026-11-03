import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import AppPreview from "./app-preview";
import Container from "./container";

export default function Hero() {
    const t = useTranslations("Landing");

    return (
        <section aria-labelledby="hero-title" className="relative z-10 pb-20 pt-14 lg:pb-28 lg:pt-24">
            <Container className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
                <div className="min-w-0">
                    <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-white/90 px-3.5 text-[13px] font-semibold text-orange-800">
                        <Check aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
                        {t("hero.pill")}
                    </span>
                    {/* gradient-title sets pb-2 in a later layer, so the design's 12px needs the important modifier */}
                    <h1
                        id="hero-title"
                        className="gradient-title mt-6 pb-3! text-[52px] leading-[1.02] md:text-[72px] lg:text-[68px] xl:text-[84px]"
                    >
                        {t("hero.title")}
                    </h1>
                    <p className="mb-9 mt-5 max-w-[520px] text-xl font-medium leading-[1.55] text-white [text-shadow:0_1px_12px_rgba(67,20,7,0.45)]">
                        {t("hero.subtitle")}
                    </p>
                    <div className="flex flex-wrap gap-3.5">
                        <Button asChild size="lg" className="h-11 px-7 font-semibold bg-orange-700 hover:bg-orange-800 text-white shadow-md">
                            <Link href="/dashboard">
                                {t("getStarted")}
                                <ArrowRight />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-11 px-7">
                            <a href="#month">
                                {t("hero.seeMonth")}
                                <ArrowDown />
                            </a>
                        </Button>
                    </div>
                    <p className="mt-7 text-sm font-medium text-orange-50">{t("hero.languages")}</p>
                </div>
                <AppPreview />
            </Container>
        </section>
    );
}
