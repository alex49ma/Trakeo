"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea component exists or use standard textarea
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { MessageSquarePlus, Loader2, X } from "lucide-react"; // Changed icon to MessageSquarePlus
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { feedbackSchema } from "@/app/lib/schema";
import { sendFeedback } from "@/actions/send-feedback";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";

export function FeedbackButton() {
    const [open, setOpen] = useState(false);
    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(feedbackSchema),
    });

    const { loading, fetchData, error, data } = useFetch(sendFeedback);

    const onSubmit = async (data) => {
        await fetchData(data);
    };

    useEffect(() => {
        if (data?.success) {
            toast.success("Feedback sent! Thank you.");
            reset();
            setOpen(false);
        }
        if (error || data?.success === false) { // Handle server action returning success: false
            toast.error(error?.message || data?.error || "Something went wrong");
        }
    }, [data, error, reset]);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="h-12 w-12 rounded-full shadow-lg bg-background hover:bg-accent"
                    >
                        <MessageSquarePlus className="h-6 w-6" />
                        <span className="sr-only">Feedback</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 mr-4 mb-2" sideOffset={5} align="end">
                    <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
                        <h4 className="font-medium leading-none">Send Feedback</h4>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            We value your input! Let us know what you think or report a bug.
                        </p>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Textarea
                                    placeholder="Your feedback..."
                                    className="min-h-[100px] resize-none"
                                    {...register("message")}
                                />
                                {errors.message && (
                                    <p className="text-xs text-red-500">{errors.message.message}</p>
                                )}
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Feedback
                            </Button>
                        </form>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
