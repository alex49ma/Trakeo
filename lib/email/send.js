// Sends transactional emails through Resend (D6, D18 in ../SDD/better-auth-migration/)
import { after } from "next/server";
import { Resend } from "resend";

let resend;

/**
 * Sends one email ({ to, subject, html, text }). Without RESEND_API_KEY, development only logs it (with its links),
 * and production throws.
 */
export async function sendEmail({ to, subject, html, text }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
        console.info(`[email] Not sent (no RESEND_API_KEY). To: ${to}\nSubject: ${subject}\n${text}`);
        return;
    }

    resend ??= new Resend(apiKey);
    const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM, to, subject, html, text });
    if (error) throw new Error(`Resend refused the email: ${error.message}`);
}

/**
 * Sends the email after the response, so the auth request doesn't wait for it (no timing hints about which
 * accounts exist) and a serverless function keeps running until it's sent. Failures are only logged.
 */
export function sendInBackground(email) {
    const task = () => sendEmail(email).catch((error) => console.error("Email failed:", error));
    try {
        after(task);
    } catch {
        // Outside a request (a script): send it now instead
        void task();
    }
}
