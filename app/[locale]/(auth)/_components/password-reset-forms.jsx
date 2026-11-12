"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emailOnlySchema, newPasswordSchema } from "@/app/lib/schema";
import { authClient, authErrorMessage, callAuth } from "@/lib/auth-client";
import PasswordInput from "./password-input";
import { Field, FormMessage } from "./auth-card";

const LINK = "font-medium text-orange-800 underline-offset-4 hover:underline";

// Step 1, /forgot-password: asks for the link. The answer is the same for every email, registered or not
export function ForgotPasswordForm() {
    const t = useTranslations("Auth");
    const locale = useLocale();
    const [sentTo, setSentTo] = useState(null);
    const [message, setMessage] = useState(null);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(emailOnlySchema),
        defaultValues: { email: "" },
    });

    const onSubmit = async ({ email }) => {
        setMessage(null);
        const { error, retryAfter } = await callAuth((fetchOptions) =>
            // The email's link goes to /<user's locale>/reset-password whatever this says (lib/better-auth.js)
            authClient.requestPasswordReset({ email, redirectTo: `/${locale}/reset-password`, fetchOptions })
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
                <FormMessage tone="status">{t("forgot.sent", { email: sentTo })}</FormMessage>
                <p className="text-center text-sm">
                    <Link href="/sign-in" className={LINK}>
                        {t("forgot.back")}
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormMessage>{message}</FormMessage>
            <Field id="email" label={t("fields.email")} error={errors.email && t(`validation.${errors.email.message}`)}>
                <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
            </Field>
            <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? t("forgot.submitting") : t("forgot.submit")}
            </Button>
            <p className="text-center text-sm">
                <Link href="/sign-in" className={LINK}>
                    {t("forgot.back")}
                </Link>
            </p>
        </form>
    );
}

// What /reset-password shows for a link that has expired, was used already, or has no token
export function InvalidResetLink() {
    const t = useTranslations("Auth");

    return (
        <div className="space-y-5">
            <FormMessage>{t("reset.invalidBody")}</FormMessage>
            <Button asChild className="h-10 w-full">
                <Link href="/forgot-password">{t("reset.requestNew")}</Link>
            </Button>
        </div>
    );
}

// Step 2, /reset-password?token=…: the new password. Better Auth then signs every device out, so the next step is
// signing in again
export function ResetPasswordForm({ token }) {
    const t = useTranslations("Auth");
    const [state, setState] = useState("form"); // form | done | invalid
    const [message, setMessage] = useState(null);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(newPasswordSchema),
        defaultValues: { password: "" },
    });

    const onSubmit = async ({ password }) => {
        setMessage(null);
        const { error, retryAfter } = await callAuth((fetchOptions) =>
            authClient.resetPassword({ newPassword: password, token, fetchOptions })
        );

        if (error?.code === "INVALID_TOKEN") {
            setState("invalid");
            return;
        }
        if (error) {
            setMessage(authErrorMessage(t, error, retryAfter));
            return;
        }
        setState("done");
    };

    if (state === "invalid") return <InvalidResetLink />;

    if (state === "done") {
        return (
            <div className="space-y-5">
                <FormMessage tone="status">{t("reset.done")}</FormMessage>
                <Button asChild className="h-10 w-full">
                    <Link href="/sign-in">{t("reset.signIn")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormMessage>{message}</FormMessage>
            <Field
                id="password"
                label={t("fields.newPassword")}
                error={errors.password && t(`validation.${errors.password.message}`)}
                hint={t("fields.passwordHint")}
            >
                <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
            </Field>
            <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? t("reset.submitting") : t("reset.submit")}
            </Button>
        </form>
    );
}
