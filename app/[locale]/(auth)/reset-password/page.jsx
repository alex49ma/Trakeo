import { getTranslations } from "next-intl/server";
import AuthCard from "../_components/auth-card";
import { InvalidResetLink, ResetPasswordForm } from "../_components/password-reset-forms";
import { param } from "../_components/params";

export async function generateMetadata() {
    const t = await getTranslations("Auth.reset");
    return { title: `${t("title")} · Trakeo` };
}

// The reset email's link lands here through Better Auth: ?token=… when the link is valid, ?error=INVALID_TOKEN when
// it expired or was used already
export default async function ResetPasswordPage({ searchParams }) {
    const params = await searchParams;
    const token = param(params, "token");
    const invalid = !token || param(params, "error");

    const t = await getTranslations("Auth.reset");

    return (
        <AuthCard title={invalid ? t("invalidTitle") : t("title")}>
            {invalid ? <InvalidResetLink /> : <ResetPasswordForm token={token} />}
        </AuthCard>
    );
}
