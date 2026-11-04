import { AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
    warning: { icon: AlertTriangle, className: "border-amber-300 bg-amber-50 text-amber-900" },
    error: { icon: XCircle, className: "border-red-300 bg-red-50 text-red-900" },
    info: { icon: Info, className: "border-sky-200 bg-sky-50 text-sky-900" },
};

/** A highlighted message box, with an optional action (a button) on the right. */
export default function Notice({ variant = "info", children, action, className }) {
    const { icon: Icon, className: colors } = VARIANTS[variant];
    return (
        <div role={variant === "info" ? "status" : "alert"} className={cn("flex flex-wrap items-start gap-3 rounded-md border p-3 text-sm", colors, className)}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">{children}</div>
            {action}
        </div>
    );
}
