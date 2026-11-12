import { getTranslations } from "next-intl/server";
import AuthCard from "../_components/auth-card";
import { ForgotPasswordForm } from "../_components/password-reset-forms";

export async function generateMetadata() {
    const t = await getTranslations("Auth.forgot");
    return { title: `${t("title")} · Trakeo` };
}

// Open to signed-in users too: it's also how someone who signed up with Google sets a password
export default async function ForgotPasswordPage() {
    const t = await getTranslations("Auth.forgot");

    return (
        <AuthCard title={t("title")} subtitle={t("subtitle")}>
            <ForgotPasswordForm />
        </AuthCard>
    );
}
