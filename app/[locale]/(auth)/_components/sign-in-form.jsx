"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInSchema } from "@/app/lib/schema";
import { authClient, authErrorMessage, callAuth } from "@/lib/auth-client";
import { DEFAULT_REDIRECT } from "@/lib/safe-redirect";
import GoogleButton, { OrDivider } from "./google-button";
import PasswordInput from "./password-input";
import { Field, FormMessage } from "./auth-card";

// redirectTo: where to go once signed in, already checked by safeRedirect. initialError: an ?error= code, from a
// Google sign-in that failed
export default function SignInForm({ redirectTo, initialError }) {
    const t = useTranslations("Auth");
    const router = useRouter();
    const [message, setMessage] = useState(() => (initialError ? authErrorMessage(t, initialError) : null));
    const [leaving, setLeaving] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(signInSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = async ({ email, password }) => {
        setMessage(null);
        const { error, retryAfter } = await callAuth((fetchOptions) =>
            authClient.signIn.email({ email, password, fetchOptions })
        );

        // An unverified email gets a new link automatically (sendOnSignIn), which the message says
        if (error) {
            setMessage(authErrorMessage(t, error, retryAfter));
            return;
        }

        setLeaving(true);
        router.replace(redirectTo);
        router.refresh();
    };

    const busy = isSubmitting || leaving;
    // Keeps the destination when switching to sign-up
    const keepRedirect = redirectTo === DEFAULT_REDIRECT ? {} : { query: { redirect: redirectTo } };
    const fieldError = (field) => errors[field] && t(`validation.${errors[field].message}`);

    return (
        <div>
            <GoogleButton redirectTo={redirectTo} onError={setMessage} />
            <OrDivider />

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <FormMessage>{message}</FormMessage>

                <Field id="email" label={t("fields.email")} error={fieldError("email")}>
                    <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
                </Field>

                <Field id="password" label={t("fields.password")} error={fieldError("password")}>
                    <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
                </Field>

                <div className="text-right text-sm">
                    <Link href="/forgot-password" className="text-orange-800 underline-offset-4 hover:underline">
                        {t("signIn.forgot")}
                    </Link>
                </div>

                <Button type="submit" className="h-10 w-full" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    {busy ? t("signIn.submitting") : t("signIn.submit")}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                {t("signIn.noAccount")}{" "}
                <Link href={{ pathname: "/sign-up", ...keepRedirect }} className="font-medium text-orange-800 underline-offset-4 hover:underline">
                    {t("signIn.signUpLink")}
                </Link>
            </p>
        </div>
    );
}
