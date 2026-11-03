import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { SAMPLE } from "@/data/landing";
import Container from "./container";
import { HandArrow, HandNote, HandText } from "./hand";
import { BreakdownMock, BudgetMock, CsvImportMock, SalaryMock, SignUpMock, TransferMock } from "./month-mocks";

// "How it works" told as one month. Each row is [day label | dot | content] from md, and the space above a row grows
// with the real gap in days. The design's geometry (side-by-side rows, card offsets, margin notes) needs a 944px
// content column, which it gets from xl. Between md and xl the side-by-side rows stack, and offsets and notes start at
// the breakpoint where they fit. Below md it's one column without the axis, rotations, offsets or margin notes

// A wobbly hand-drawn line, stretched to the list's height
const AXIS = "M10 0 C 13 70, 7 140, 10 210 S 13 330, 9 430 S 12 560, 10 640 S 7 760, 11 860 S 9 960, 10 1000";

const DOTS = {
    solid: "mt-[22px] size-[18px] bg-orange-700 ring-[6px] ring-orange-100",
    // Day 9, when nothing happens
    hollow: "mt-3.5 size-3.5 bg-orange-50 ring-[3px] ring-orange-300",
    // Day 30, the end of the story
    large: "mt-5 size-6 bg-orange-700 ring-[6px] ring-orange-100",
};

const TITLE = "mb-2 text-[26px] font-bold tracking-[-0.01em] text-neutral-950";
const BODY = "text-[17px] leading-[1.6] text-neutral-700";
// Rows whose text and card sit side by side from xl
const SIDE_BY_SIDE = "flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-10";

// The mock UI isn't interactive, and the row's text already says what it shows, so the keyboard and screen readers
// skip it. z-10 keeps it above the paper grain
function Mock({ className, children }) {
    return (
        <div inert aria-hidden="true" className={cn("relative z-10", className)}>
            {children}
        </div>
    );
}

function Row({ day, step, dot = "solid", className, children }) {
    const t = useTranslations("Landing.month");
    const quiet = dot === "hollow";

    return (
        <li className={cn("pt-10 md:grid md:grid-cols-[200px_64px_1fr] md:items-start", className)}>
            <div className="mb-3 flex items-baseline gap-2.5 md:mb-0 md:block md:text-right">
                <div className={cn("text-[12px] font-bold uppercase tracking-[0.1em]", quiet ? "text-amber-700" : "text-orange-800")}>
                    {t("day")}
                </div>
                <div
                    className={cn(
                        "text-[36px] font-extrabold leading-none tracking-[-0.04em]",
                        quiet ? "text-[#ea8a4a]" : "text-orange-700 md:text-[56px]"
                    )}
                >
                    {day}
                </div>
                {step && <HandText className="text-[21px] text-orange-700 md:mt-2">{step}</HandText>}
            </div>
            <div aria-hidden="true" className="hidden md:block">
                <div className={cn("relative z-10 mx-auto rounded-full", DOTS[dot])} />
            </div>
            <div className="min-w-0 md:pl-2">{children}</div>
        </li>
    );
}

export default function MonthTimeline() {
    const t = useTranslations("Landing.month");
    const locale = useLocale();
    const transferAmount = formatMoney(SAMPLE.transfer.amount, "EUR", locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const budgetPercent = new Intl.NumberFormat(locale, { style: "percent" }).format(SAMPLE.monthBudget.spent / SAMPLE.monthBudget.limit);

    return (
        // A light band without a position of its own, so the paper grain textures it
        <section
            id="month"
            aria-labelledby="month-title"
            className="scroll-mt-24 border-t border-dashed border-orange-300 bg-orange-50/90 pb-24 pt-10 md:pb-32"
        >
            <Container>
                {/* The heading starts where the rows' content does */}
                <div className="mb-10 mt-8 items-end md:mt-[72px] md:grid md:grid-cols-[264px_1fr] lg:grid-cols-[264px_1fr_auto]">
                    <div className="hidden md:block" />
                    <div>
                        <HandText className="mb-1.5 inline-block -rotate-2 text-[22px] text-orange-700">{t("eyebrow")}</HandText>
                        <h2
                            id="month-title"
                            className="text-[48px] font-extrabold leading-none tracking-[-0.045em] text-orange-800 sm:text-[56px] md:text-[68px]"
                        >
                            {t("title")}
                        </h2>
                        <p className="mt-[18px] max-w-[520px] text-lg leading-[1.6] text-neutral-700">{t("subtitle")}</p>
                    </div>
                    <div className="relative hidden h-[150px] w-[250px] lg:block">
                        <HandNote
                            from="lg"
                            arrow="curve"
                            className="inset-0"
                            textClassName="absolute right-0 top-0 rotate-4 text-[24px]"
                            arrowClassName="absolute right-[70px] top-[38px]"
                        >
                            {t("spoiler")}
                        </HandNote>
                    </div>
                </div>

                <div className="relative">
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 20 1000"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute left-[222px] top-2.5 hidden h-[calc(100%_-_60px)] w-5 overflow-visible md:block"
                    >
                        <path
                            d={AXIS}
                            fill="none"
                            strokeWidth="3"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                            className="stroke-orange-300"
                        />
                    </svg>

                    <ol>
                        <Row day={0} step={t("steps.signUp")} className="pt-0">
                            <h3 className={TITLE}>{t("days.0.title")}</h3>
                            <p className={cn(BODY, "max-w-[480px]")}>{t("days.0.body")}</p>
                            <div className="relative mt-7">
                                <Mock className="max-w-[360px] md:ml-10 md:-rotate-[1.5deg]">
                                    <SignUpMock />
                                </Mock>
                                <HandNote
                                    from="lg"
                                    arrow="left"
                                    arrowFirst
                                    className="left-[430px] top-[70px] w-[240px]"
                                    textClassName="mt-0.5 -rotate-3 text-[23px]"
                                >
                                    {t("days.0.note")}
                                </HandNote>
                            </div>
                        </Row>

                        <Row day={1} step={t("steps.track")} className="md:pt-14">
                            <div className={SIDE_BY_SIDE}>
                                <div className="max-w-[330px]">
                                    <h3 className={TITLE}>{t("days.1.title")}</h3>
                                    <p className={BODY}>{t("days.1.body")}</p>
                                </div>
                                <div className="relative xl:mt-3.5">
                                    <Mock className="max-w-[420px] md:rotate-[0.8deg] xl:w-[420px]">
                                        <SalaryMock />
                                    </Mock>
                                    <HandNote
                                        layout="flex"
                                        arrow="check"
                                        arrowFirst
                                        className="left-[250px] top-[78px] items-center gap-1.5"
                                        textClassName="-rotate-2 text-[22px]"
                                    >
                                        {t("days.1.note")}
                                    </HandNote>
                                </div>
                            </div>
                        </Row>

                        <Row day={6} className="md:pt-28">
                            <h3 className={TITLE}>{t("days.6.title")}</h3>
                            <p className={cn(BODY, "max-w-[540px]")}>{t("days.6.body", { amount: transferAmount })}</p>
                            <div className="relative mt-[26px]">
                                <Mock className="max-w-[540px] lg:ml-[120px]">
                                    <TransferMock />
                                </Mock>
                                <HandNote
                                    from="xl"
                                    arrow="down-left"
                                    className="left-[690px] top-[104px] w-[220px]"
                                    textClassName="ml-[34px] rotate-3 text-[24px]"
                                >
                                    {t("days.6.note")}
                                </HandNote>
                            </div>
                        </Row>

                        <Row day={9} dot="hollow" className="md:pt-[72px]">
                            <HandText as="p" className="origin-left text-[28px] md:ml-[60px] md:mt-1 md:-rotate-[1.5deg]">
                                {t("days.9.note")}
                            </HandText>
                        </Row>

                        <Row day={14} className="md:pt-24">
                            <div className={SIDE_BY_SIDE}>
                                <div className="relative max-w-[430px] xl:mt-1.5 xl:w-[430px] xl:shrink-0">
                                    <Mock className="md:rotate-1">
                                        <BudgetMock />
                                    </Mock>
                                    {/* Circles the yellow bar */}
                                    <HandArrow
                                        variant="ellipse"
                                        className="pointer-events-none absolute left-[-18px] top-[52px] z-20 hidden h-[70px] w-[calc(100%_+_50px)] text-orange-700 md:block"
                                    />
                                    {/* Beside the card while the text sits below it, under the card once the text moves right */}
                                    <HandNote
                                        from="lg"
                                        className="lg:left-[460px] lg:top-14 lg:w-[200px] xl:left-[300px] xl:top-[150px] xl:w-auto"
                                        textClassName="-rotate-3 text-[22px]"
                                    >
                                        {t("days.14.note")}
                                    </HandNote>
                                </div>
                                <div className="max-w-[360px] xl:pt-1">
                                    <h3 className={TITLE}>{t("days.14.title")}</h3>
                                    <p className={BODY}>{t("days.14.body", { percent: budgetPercent })}</p>
                                </div>
                            </div>
                        </Row>

                        <Row day={22} className="md:pt-[136px]">
                            <div className={SIDE_BY_SIDE}>
                                <div className="max-w-[320px]">
                                    <h3 className={TITLE}>{t("days.22.title")}</h3>
                                    <p className={BODY}>{t("days.22.body")}</p>
                                    <Badge className="mt-3.5 h-6 rounded-full border-transparent bg-trakeo-teal px-2.5 text-xs font-semibold text-white">
                                        {t("days.22.beta")}
                                    </Badge>
                                </div>
                                <Mock className="max-w-[500px] lg:ml-[30px] xl:mt-2 xl:w-[500px]">
                                    <CsvImportMock />
                                </Mock>
                            </div>
                        </Row>

                        <Row day={30} step={t("steps.understand")} dot="large" className="md:pt-[136px]">
                            <h3 className={cn(TITLE, "text-[34px]")}>{t("days.30.title")}</h3>
                            <p className={cn(BODY, "max-w-[480px]")}>{t("days.30.body")}</p>
                            <div className="relative mt-7">
                                <Mock className="max-w-[640px] md:-rotate-[0.6deg]">
                                    <BreakdownMock />
                                </Mock>
                                <HandNote
                                    from="xl"
                                    arrow="down-left-short"
                                    className="left-[670px] top-[70px] w-[200px]"
                                    textClassName="ml-[30px] -rotate-4 text-[26px]"
                                >
                                    {t("days.30.note")}
                                </HandNote>
                            </div>
                            <HandText as="p" className="mt-12 origin-left text-[26px] md:ml-[60px] md:rotate-[1.5deg] lg:ml-[260px]">
                                {t("closing")}
                            </HandText>
                        </Row>
                    </ol>
                </div>
            </Container>
        </section>
    );
}
