"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emailOnlySchema } from "@/app/lib/schema";
import { authClient, authErrorMessage, callAuth } from "@/lib/auth-client";
import { Field, FormMessage } from "./auth-card";

// Asks for another confirmation link. The answer is the same whether or not the email needs confirming (Better Auth
// doesn't reveal it), so the message is too. The link always comes back to /verify-email (lib/better-auth.js)
async function requestLink(email) {
    return callAuth((fetchOptions) => authClient.sendVerificationEmail({ email, fetchOptions }));
}

// A button for a known email: the one the sign-up form just used
export function ResendButton({ email }) {
    const t = useTranslations("Auth");
    const [state, setState] = useState({ sending: false, message: null, tone: "status" });

    const resend = async () => {
        setState({ sending: true, message: null, tone: "status" });
        const { error, retryAfter } = await requestLink(email);
        setState(
            error
                ? { sending: false, message: authErrorMessage(t, error, retryAfter), tone: "error" }
                : { sending: false, message: t("verify.sent"), tone: "status" }
        );
    };

    return (
        <div className="space-y-3">
            <FormMessage tone={state.tone}>{state.message}</FormMessage>
            <Button type="button" variant="outline" className="h-10 w-full" onClick={resend} disabled={state.sending}>
                {state.sending && <Loader2 className="size-4 animate-spin" />}
                {state.sending ? t("verify.sending") : t("verify.resend")}
            </Button>
        </div>
    );
}

// A form for when the email isn't known: an expired link, or someone who lost the email
export function ResendForm() {
    const t = useTranslations("Auth");
    const [result, setResult] = useState({ message: null, tone: "status" });

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(emailOnlySchema),
        defaultValues: { email: "" },
    });

    const onSubmit = async ({ email }) => {
        setResult({ message: null, tone: "status" });
        const { error, retryAfter } = await requestLink(email);
        setResult(
            error
                ? { message: authErrorMessage(t, error, retryAfter), tone: "error" }
                : { message: t("verify.sent"), tone: "status" }
        );
    };

    return (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormMessage tone={result.tone}>{result.message}</FormMessage>
            <Field id="email" label={t("fields.email")} error={errors.email && t(`validation.${errors.email.message}`)}>
                <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
            </Field>
            <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? t("verify.sending") : t("verify.resend")}
            </Button>
        </form>
    );
}
