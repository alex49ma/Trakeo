import { Ban, EyeOff, Gift, Landmark } from "lucide-react";
import { useTranslations } from "next-intl";
import Container from "./container";

const PROMISES = [
    { key: "noBankLogin", Icon: Landmark },
    { key: "noTrackers", Icon: EyeOff },
    { key: "noAds", Icon: Ban },
    { key: "free", Icon: Gift },
];

// A light band under the hero. It isn't positioned, so the paper grain textures it
export default function Promises() {
    const t = useTranslations("Landing.promises");

    return (
        <section aria-label={t("label")} className="bg-orange-50/90 py-9">
            <Container>
                <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {PROMISES.map(({ key, Icon }) => (
                        <li key={key} className="flex items-center gap-3 sm:gap-3.5">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-orange-100 text-orange-700">
                                <Icon aria-hidden="true" className="size-[22px]" />
                            </div>
                            <div>
                                <div className="text-base font-bold text-orange-800 sm:text-lg">{t(`${key}.value`)}</div>
                                <div className="text-sm text-[#6b6b6b]">{t(`${key}.label`)}</div>
                            </div>
                        </li>
                    ))}
                </ul>
            </Container>
        </section>
    );
}
