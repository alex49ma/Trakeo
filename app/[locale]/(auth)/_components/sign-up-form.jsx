"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpSchema } from "@/app/lib/schema";
import { authClient, authErrorMessage, callAuth } from "@/lib/auth-client";
import { DEFAULT_REDIRECT } from "@/lib/safe-redirect";
import GoogleButton, { OrDivider } from "./google-button";
import PasswordInput from "./password-input";
import { Field, FormMessage } from "./auth-card";
import { ResendButton } from "./resend-verification";

const LINK = "font-medium text-orange-800 underline-offset-4 hover:underline";

// After a sign-up the form turns into "check your inbox". An email that already has an account gets the same
// answer (lib/better-auth.js emails its owner instead), so the form can't be used to find registered emails
export default function SignUpForm({ redirectTo }) {
    const t = useTranslations("Auth");
    const locale = useLocale();
    const [message, setMessage] = useState(null);
    const [sentTo, setSentTo] = useState(null);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(signUpSchema),
        defaultValues: { name: "", email: "", password: "" },
    });

    const onSubmit = async ({ name, email, password }) => {
        setMessage(null);
        const { error, retryAfter } = await callAuth((fetchOptions) =>
            // locale: the language of the user's emails (D17)
            authClient.signUp.email({ name, email, password, locale, fetchOptions })
        );

        if (error) {
            setMessage(authErrorMessage(t, error, retryAfter));
            return;
        }
        setSentTo(email);
    };

    if (sentTo) {
        return (
            <div className="space-y-5">
                <div className="flex items-start gap-3">
                    <MailCheck className="mt-0.5 size-6 shrink-0 text-orange-700" aria-hidden="true" />
                    <div className="space-y-2 text-sm">
                        <p className="font-semibold">{t("signUp.sentTitle")}</p>
                        <p>{t("signUp.sentBody", { email: sentTo })}</p>
                        <p className="text-muted-foreground">{t("signUp.sentHint")}</p>
                    </div>
                </div>
                <ResendButton email={sentTo} />
                <p className="text-center text-sm text-muted-foreground">
                    <Link href="/sign-in" className={LINK}>
                        {t("signUp.signInLink")}
                    </Link>
                </p>
            </div>
        );
    }

    const keepRedirect = redirectTo === DEFAULT_REDIRECT ? {} : { query: { redirect: redirectTo } };
    const fieldError = (field) => errors[field] && t(`validation.${errors[field].message}`);

    return (
        <div>
            <GoogleButton redirectTo={redirectTo} onError={setMessage} />
            <OrDivider />

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <FormMessage>{message}</FormMessage>

                <Field id="name" label={t("fields.name")} error={fieldError("name")}>
                    <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
                </Field>

                <Field id="email" label={t("fields.email")} error={fieldError("email")}>
                    <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
                </Field>

                <Field id="password" label={t("fields.password")} error={fieldError("password")} hint={t("fields.passwordHint")}>
                    <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
                </Field>

                <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                    {isSubmitting ? t("signUp.submitting") : t("signUp.submit")}
                </Button>

                <p className="text-xs text-muted-foreground">
                    {t.rich("signUp.privacy", {
                        link: (chunks) => (
                            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                                {chunks}
                            </Link>
                        ),
                    })}
                </p>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                {t("signUp.haveAccount")}{" "}
                <Link href={{ pathname: "/sign-in", ...keepRedirect }} className={LINK}>
                    {t("signUp.signInLink")}
                </Link>
            </p>
        </div>
    );
}
