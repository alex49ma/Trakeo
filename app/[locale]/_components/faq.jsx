import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Container from "./container";
import { HandText } from "./hand";

const QUESTIONS = ["free", "bank", "currencies", "rates", "tracking", "languages"];

// Native <details>, so it opens from the keyboard and works without JavaScript. The plus turns into a cross when open
export default function Faq() {
    const t = useTranslations("Landing.faq");

    return (
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 bg-orange-50/90 py-20 md:py-28">
            <Container className="grid gap-6 md:grid-cols-12">
                <div className="md:col-span-4">
                    <h2
                        id="faq-title"
                        className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.04em] text-orange-800 lg:text-[52px]"
                    >
                        {t("title")}
                    </h2>
                    <HandText as="p" className="mt-[22px] max-w-[260px] -rotate-2 text-[22px]">
                        {t("note")}
                    </HandText>
                </div>
                <div className="md:col-span-7 md:col-start-6">
                    {QUESTIONS.map((key, index) => (
                        <details key={key} open={index === 0} className="group border-b border-orange-200 first:border-t">
                            <summary className="flex min-h-[84px] cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-5 text-[19px] font-semibold text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 [&::-webkit-details-marker]:hidden">
                                {t(`items.${key}.q`)}
                                <Plus
                                    aria-hidden="true"
                                    strokeWidth={2.2}
                                    className="size-[22px] shrink-0 text-orange-700 transition-transform duration-200 group-open:rotate-45"
                                />
                            </summary>
                            <p className="mb-[22px] max-w-[560px] text-[16px] leading-[1.6] text-neutral-700">{t(`items.${key}.a`)}</p>
                        </details>
                    ))}
                </div>
            </Container>
        </section>
    );
}
