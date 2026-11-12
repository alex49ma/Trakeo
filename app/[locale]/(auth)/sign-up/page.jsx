import { getTranslations } from "next-intl/server";
import { safeRedirect } from "@/lib/safe-redirect";
import AuthCard from "../_components/auth-card";
import SignUpForm from "../_components/sign-up-form";
import { param, redirectIfSignedIn } from "../_components/params";

export async function generateMetadata() {
    const t = await getTranslations("Auth.signUp");
    return { title: `${t("title")} · Trakeo` };
}

// The landing page's "Get started" buttons come here; a signed-in visitor goes straight on to the dashboard
export default async function SignUpPage({ searchParams }) {
    const params = await searchParams;
    const redirectTo = safeRedirect(param(params, "redirect"));
    await redirectIfSignedIn(redirectTo);

    const t = await getTranslations("Auth.signUp");

    return (
        <AuthCard title={t("title")} subtitle={t("subtitle")}>
            <SignUpForm redirectTo={redirectTo} />
        </AuthCard>
    );
}
