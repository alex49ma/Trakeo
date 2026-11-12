"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nameSchema } from "@/app/lib/schema";
import { authClient, authErrorMessage, callAuth } from "@/lib/auth-client";

// The name shown in the header menu and used in emails. Better Auth also rewrites the session's cookie cache, so the
// header shows the new name right away
export default function NameForm({ name }) {
    const t = useTranslations("Settings");
    const auth = useTranslations("Auth");
    const router = useRouter();

    const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
        resolver: zodResolver(nameSchema),
        defaultValues: { name: name ?? "" },
    });

    const onSubmit = async ({ name: newName }) => {
        const { error, retryAfter } = await callAuth((fetchOptions) => authClient.updateUser({ name: newName, fetchOptions }));

        if (error) {
            toast.error(authErrorMessage(auth, error, retryAfter));
            return;
        }
        reset({ name: newName });
        toast.success(t("profile.saved"));
        router.refresh();
    };

    return (
        <form className="flex flex-col gap-3 sm:flex-row sm:items-start" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex-1 space-y-2">
                <label htmlFor="name" className="sr-only">
                    {auth("fields.name")}
                </label>
                <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
                {errors.name && <p className="text-sm text-red-600">{auth(`validation.${errors.name.message}`)}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? t("profile.saving") : t("profile.save")}
            </Button>
        </form>
    );
}
