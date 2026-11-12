"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

// A password field with a show/hide button, which is why the sign-up form has no "repeat password" field.
// Takes react-hook-form's register() props
export default function PasswordInput(props) {
    const t = useTranslations("Auth.fields");
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <Input type={visible ? "text" : "password"} className="pr-10" {...props} />
            <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? t("hidePassword") : t("showPassword")}
                aria-pressed={visible}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-orange-700"
            >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </div>
    );
}
