import { getTranslations } from "next-intl/server";
import { safeRedirect } from "@/lib/safe-redirect";
import AuthCard from "../_components/auth-card";
import SignInForm from "../_components/sign-in-form";
import { param, redirectIfSignedIn } from "../_components/params";

export async function generateMetadata() {
    const t = await getTranslations("Auth.signIn");
    return { title: `${t("title")} · Trakeo` };
}

// ?redirect=<path>: where to go afterwards (set by the proxy). ?error=<code>: a Google sign-in that failed
export default async function SignInPage({ searchParams }) {
    const params = await searchParams;
    const redirectTo = safeRedirect(param(params, "redirect"));
    await redirectIfSignedIn(redirectTo);

    const t = await getTranslations("Auth.signIn");

    return (
        <AuthCard title={t("title")} subtitle={t("subtitle")}>
            <SignInForm redirectTo={redirectTo} initialError={param(params, "error")} />
        </AuthCard>
    );
}
