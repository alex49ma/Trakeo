"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function LanguageSwitcher() {
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();

    const handleLocaleChange = (newLocale) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger className="w-auto bg-white">
                <SelectValue placeholder="Lang" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="en">
                    <span className="md:hidden">EN</span>
                    <span className="hidden md:inline">English</span>
                </SelectItem>
                <SelectItem value="es">
                    <span className="md:hidden">ES</span>
                    <span className="hidden md:inline">Español</span>
                </SelectItem>
                <SelectItem value="de">
                    <span className="md:hidden">DE</span>
                    <span className="hidden md:inline">Deutsch</span>
                </SelectItem>
                <SelectItem value="cs">
                    <span className="md:hidden">CS</span>
                    <span className="hidden md:inline">Čeština</span>
                </SelectItem>
            </SelectContent>
        </Select>
    );
}
