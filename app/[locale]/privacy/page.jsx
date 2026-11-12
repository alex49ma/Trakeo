import { getLocale, getTranslations } from "next-intl/server";
import { PRIVACY } from "@/data/legal";

export async function generateMetadata() {
    const t = await getTranslations("Privacy");
    return { title: `${t("title")} · Trakeo` };
}

// Public (not in the proxy's list): Google's consent screen links here (D31). The texts describe what the code does,
// so a change to the data Trakeo keeps or to the services it uses must update the Privacy namespace too
const SECTIONS = [
    { key: "collect", items: ["account", "finance", "csv", "sessions", "security", "feedback"] },
    { key: "use" },
    { key: "processors", items: ["vercel", "supabase", "resend", "arcjet", "inngest", "google", "ecb"] },
    { key: "cookies" },
    { key: "retention" },
    { key: "rights" },
    { key: "changes" },
];

const H2 = "mt-10 text-xl font-semibold text-neutral-900";
const P = "mt-3 leading-relaxed text-neutral-700";

export default async function PrivacyPage() {
    const t = await getTranslations("Privacy");
    const locale = await getLocale();

    const updated = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(PRIVACY.updated));

    return (
        <article className="mx-auto w-full max-w-3xl px-4 pb-20 pt-28 sm:pt-36">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900">{t("title")}</h1>
            <p className="mt-2 text-sm text-neutral-500">{t("updated", { date: updated })}</p>
            <p className={P}>{t("intro")}</p>

            <h2 className={H2}>{t("who.heading")}</h2>
            <p className={P}>
                {PRIVACY.owner ? t("who.bodyNamed", { owner: PRIVACY.owner }) : t("who.bodyUnnamed")}{" "}
                {PRIVACY.contactEmail
                    ? t.rich("who.contactEmail", {
                          email: PRIVACY.contactEmail,
                          link: (chunks) => (
                              <a href={`mailto:${PRIVACY.contactEmail}`} className="text-orange-800 underline underline-offset-4">
                                  {chunks}
                              </a>
                          ),
                      })
                    : t("who.contactFeedback")}
            </p>

            {SECTIONS.map(({ key, items }) => (
                <section key={key}>
                    <h2 className={H2}>{t(`${key}.heading`)}</h2>
                    {t.has(`${key}.body`) && <p className={P}>{t(`${key}.body`)}</p>}
                    {items && (
                        <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-neutral-700">
                            {items.map((item) => (
                                <li key={item}>{t(`${key}.items.${item}`)}</li>
                            ))}
                        </ul>
                    )}
                </section>
            ))}
        </article>
    );
}
