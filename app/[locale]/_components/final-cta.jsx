import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import Container from "./container";
import { HandNote } from "./hand";

export default function FinalCta() {
    const t = useTranslations("Landing");

    return (
        <section aria-labelledby="cta-title" className="relative z-10 py-20 md:py-[120px]">
            <Container>
                <div className="grid items-end gap-8 rounded-[28px] bg-orange-950 px-6 py-12 shadow-[0_30px_60px_-20px_rgba(67,20,7,0.6)] sm:px-16 sm:py-[72px] lg:grid-cols-[1.4fr_1fr]">
                    <div>
                        {/* -mr-2 gives back the room gradient-title's pr-2 takes, so the English title fits on one line as designed */}
                        <h2 id="cta-title" className="gradient-title -mr-2 text-[44px] leading-[1.05] sm:text-[64px]">
                            {t("cta.title")}
                        </h2>
                        <p className="mb-8 mt-[18px] max-w-[520px] text-[19px] leading-[1.55] text-orange-200">{t("cta.body")}</p>
                        <Button asChild className="h-[52px] rounded-[10px] bg-white px-8 text-[16px] font-semibold text-orange-700 hover:bg-orange-50 has-[>svg]:px-8">
                            <Link href="/dashboard">
                                {t("getStarted")}
                                <ArrowRight className="size-[18px]" />
                            </Link>
                        </Button>
                    </div>
                    {/* Points back at the button */}
                    <div className="relative hidden h-[120px] lg:block">
                        <HandNote
                            from="lg"
                            tone="dark"
                            arrow="swoop"
                            className="inset-0"
                            textClassName="absolute left-[110px] top-0 -rotate-4 text-[28px]"
                            arrowClassName="absolute bottom-1.5 left-[-30px]"
                        >
                            {t("cta.note")}
                        </HandNote>
                    </div>
                </div>
            </Container>
        </section>
    );
}
