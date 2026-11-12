"use client";

import { useState } from "react";
import { Loader2, MonitorSmartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient, authErrorMessage, callAuth } from "@/lib/auth-client";

// Deletes every session but this one. Another device's 5-minute session cookie cache (D12) can keep it in for that
// long, which the confirmation says
export default function SignOutOthers() {
    const t = useTranslations("Settings");
    const auth = useTranslations("Auth");
    const [loading, setLoading] = useState(false);

    const signOutOthers = async () => {
        setLoading(true);
        const { error, retryAfter } = await callAuth((fetchOptions) => authClient.revokeOtherSessions({ fetchOptions }));
        setLoading(false);

        if (error) {
            toast.error(authErrorMessage(auth, error, retryAfter));
            return;
        }
        toast.success(t("devices.done"));
    };

    return (
        <Button type="button" variant="outline" onClick={signOutOthers} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <MonitorSmartphone className="size-4" />}
            {t("devices.button")}
        </Button>
    );
}
