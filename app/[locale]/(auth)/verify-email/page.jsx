import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DEFAULT_REDIRECT } from "@/lib/safe-redirect";
import AuthCard, { FormMessage } from "../_components/auth-card";
import { ResendForm } from "../_components/resend-verification";
import { param, redirectIfSignedIn } from "../_components/params";

export async function generateMetadata() {
    const t = await getTranslations("Auth.verify");
    return { title: `${t("title")} · Trakeo` };
}

// The confirmation email's link lands here through Better Auth. A valid link signs the user in, so this page sends
// them on to the dashboard. A link that expired or was used comes back with ?error=TOKEN_EXPIRED / INVALID_TOKEN.
// Without either (someone opening the page by hand, or a link for an email confirmed already) it explains the step
export default async function VerifyEmailPage({ searchParams }) {
    const params = await searchParams;
    await redirectIfSignedIn(DEFAULT_REDIRECT);

    const t = await getTranslations("Auth.verify");
    const error = param(params, "error");
    const message = error === "TOKEN_EXPIRED" ? t("expired") : error ? t("invalid") : null;

    return (
        <AuthCard title={t("title")} subtitle={message ? null : t("pending")}>
            <div className="space-y-5">
                <FormMessage>{message}</FormMessage>
                <ResendForm />
                <p className="text-center text-sm text-muted-foreground">
                    {t("haveConfirmed")}{" "}
                    <Link href="/sign-in" className="font-medium text-orange-800 underline-offset-4 hover:underline">
                        {t("signInLink")}
                    </Link>
                </p>
            </div>
        </AuthCard>
    );
}
