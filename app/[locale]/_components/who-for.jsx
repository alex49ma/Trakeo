import { Briefcase, Plane, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatMoney, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { SAMPLE } from "@/data/landing";
import Container from "./container";
import { Swatch } from "./donut";
import { HandText } from "./hand";

const CARD = "relative z-10 rounded-[16px] border bg-card text-card-foreground shadow-[0_18px_36px_-18px_rgba(124,45,18,0.45)]";
const MUTED = "text-[#6b6b6b]";
const BODY = cn("text-[16px] leading-[1.55]", MUTED);

function IconCircle({ Icon }) {
    return (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            <Icon aria-hidden="true" className="size-[22px]" />
        </div>
    );
}

function Tag({ children }) {
    return <div className={cn("text-[13px] font-semibold uppercase tracking-[0.06em]", MUTED)}>{children}</div>;
}

// Three uneven cards on a 12-column grid, with a taped note. Everything stacks below md
export default function WhoFor() {
    const t = useTranslations("Landing.who");
    const locale = useLocale();
    const money = (amount, currency = "EUR", options) => formatMoney(amount, currency, locale, options);
    const subscriptionsTotal = SAMPLE.subscriptions.reduce((sum, { amount }) => sum + amount, 0);
    const { business, personal } = SAMPLE.freelance;

    return (
        <section id="who" aria-labelledby="who-title" className="relative z-10 scroll-mt-24 py-24 md:pb-32 md:pt-[120px]">
            <Container className="grid gap-6 md:grid-cols-12">
                <h2
                    id="who-title"
                    className="gradient-title text-[44px] leading-[1.05] sm:text-[60px] md:col-span-6 md:col-start-1"
                >
                    {t("title")}
                </h2>
                <div className="relative hidden w-[268px] rotate-3 self-center bg-orange-50 px-6 pb-[18px] pt-[22px] shadow-[0_10px_24px_-12px_rgba(67,20,7,0.5)] md:col-span-3 md:col-start-9 md:block">
                    <div aria-hidden="true" className="absolute -top-3 left-[74px] h-6 w-[76px] -rotate-4 bg-orange-300/75" />
                    <HandText className="text-[22px]">{t("note")}</HandText>
                </div>

                <article className={cn(CARD, "grid items-center gap-7 p-8 md:col-span-7 md:col-start-1 lg:grid-cols-2")}>
                    <div>
                        <IconCircle Icon={User} />
                        <h3 className="mb-0.5 mt-4 text-[24px] font-bold">{t("personal.title")}</h3>
                        <Tag>{t("personal.tag")}</Tag>
                        <p className={cn(BODY, "mt-3.5")}>{t("personal.body")}</p>
                    </div>
                    <div className="rounded-[12px] bg-orange-50 px-[18px] py-4 text-[14px]">
                        {SAMPLE.subscriptions.map(({ key, amount }) => (
                            <div key={key} className="flex items-center justify-between gap-3 py-1.5">
                                <span>{t(`personal.${key}`)}</span>
                                <span className="whitespace-nowrap font-semibold">{t("personal.perMonth", { amount: money(amount) })}</span>
                            </div>
                        ))}
                        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-dashed border-orange-300 pb-0.5 pt-2.5">
                            <span className={MUTED}>{t("personal.subscriptions")}</span>
                            <span className="whitespace-nowrap font-bold text-orange-800">
                                {t("personal.perMonth", { amount: money(subscriptionsTotal) })}
                            </span>
                        </div>
                    </div>
                </article>

                <article className={cn(CARD, "p-[30px] md:col-span-5 md:col-start-8 md:mt-[88px]")}>
                    <div className="flex items-center gap-3.5">
                        <IconCircle Icon={Briefcase} />
                        <div>
                            <h3 className="text-[22px] font-bold">{t("freelancers.title")}</h3>
                            <Tag>{t("freelancers.tag")}</Tag>
                        </div>
                    </div>
                    <p className={cn(BODY, "mb-5 mt-4")}>{t("freelancers.body")}</p>
                    {/* The legend below says the same in text */}
                    <div aria-hidden="true" className="flex h-3.5 gap-[3px] overflow-hidden rounded-full">
                        <div className="bg-trakeo-teal" style={{ flex: business }} />
                        <div className="bg-orange-400" style={{ flex: personal }} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[14px]">
                        <span className="flex items-center gap-1.5">
                            <Swatch className="bg-trakeo-teal" />
                            <span>
                                {t("freelancers.business")} <b>{money(business)}</b>
                            </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Swatch className="bg-orange-400" />
                            <span>
                                {t("freelancers.personal")} <b>{money(personal)}</b>
                            </span>
                        </span>
                    </div>
                </article>

                <article className={cn(CARD, "p-[30px] md:col-span-7 md:col-start-3")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                            <IconCircle Icon={Plane} />
                            <div>
                                <h3 className="text-[22px] font-bold">{t("travelers.title")}</h3>
                                <Tag>{t("travelers.tag")}</Tag>
                            </div>
                        </div>
                        <div className="flex max-w-[320px] flex-wrap gap-1.5 sm:justify-end">
                            {SUPPORTED_CURRENCIES.map((currency) => (
                                <Badge
                                    key={currency}
                                    className="h-6 rounded-full border-transparent bg-orange-100 px-2.5 text-[12px] font-semibold text-orange-800"
                                >
                                    {currency}
                                </Badge>
                            ))}
                        </div>
                    </div>
                    <p className={cn(BODY, "mb-[18px] mt-4")}>{t("travelers.body")}</p>
                    <div className="grid gap-3 text-[14px] sm:grid-cols-3">
                        {SAMPLE.travel.map(({ key, amount, currency, wholeUnits }) => (
                            <div key={key} className="rounded-[12px] bg-orange-50 px-4 py-3.5">
                                <div className={cn("text-[12px]", MUTED)}>{t(`travelers.${key}`)}</div>
                                <div className="mt-1 whitespace-nowrap text-[17px] font-bold">
                                    {money(amount, currency, wholeUnits ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : undefined)}
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </Container>
        </section>
    );
}
