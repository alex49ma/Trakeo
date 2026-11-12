import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import NameForm from "./_components/name-form";
import SignOutOthers from "./_components/sign-out-others";

export async function generateMetadata() {
    const t = await getTranslations("Settings");
    return { title: `${t("title")} · Trakeo` };
}

// Only the name and "sign out other devices" (D24, revision 5): passwords go through "Forgot your password?", and
// Google links itself at sign-in
export default async function SettingsPage() {
    const user = await requireUser();
    const t = await getTranslations("Settings");

    return (
        <div className="mx-auto max-w-2xl space-y-6 px-4">
            <h1 className="text-5xl gradient-title mb-8">{t("title")}</h1>

            <Card className="gap-0 p-6">
                <h2 className="text-lg font-semibold">{t("profile.heading")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("profile.description", { email: user.email })}</p>
                <div className="mt-5">
                    <NameForm name={user.name} />
                </div>
            </Card>

            <Card className="gap-0 p-6">
                <h2 className="text-lg font-semibold">{t("devices.heading")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("devices.description")}</p>
                <div className="mt-5">
                    <SignOutOthers />
                </div>
            </Card>
        </div>
    );
}
