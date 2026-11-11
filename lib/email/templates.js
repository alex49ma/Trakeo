// The auth emails, in the user's language (users.locale, D17). Texts live in the Emails namespace of messages/*.json
import { createTranslator } from "next-intl";
import { routing } from "@/i18n/routing";

const MESSAGES = {
    en: () => import("@/messages/en.json"),
    es: () => import("@/messages/es.json"),
    cs: () => import("@/messages/cs.json"),
};

async function emailTranslator(locale) {
    const resolved = routing.locales.includes(locale) ? locale : routing.defaultLocale;
    const messages = (await MESSAGES[resolved]()).default;
    return createTranslator({ locale: resolved, messages, namespace: "Emails" });
}

// Names come from users, so they're escaped before going into HTML
const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function greeting(t, user) {
    const name = user.name?.trim();
    return name ? t("greeting", { name }) : t("greetingNoName");
}

/**
 * One email: a greeting, a heading, paragraphs, a button and small print. Returns { html, text }.
 * Inline styles and a table layout, because many email clients ignore stylesheets.
 */
function render(t, { user, heading, paragraphs, button, url, smallPrint = [] }) {
    const p = (text, style = "") =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#262626;${style}">${escapeHtml(text)}</p>`;

    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#fff7ed;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px;font-family:Arial,Helvetica,sans-serif;">
<tr><td>
<p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:#c2410c;">Trakeo</p>
<h1 style="margin:0 0 16px;font-size:22px;color:#171717;">${escapeHtml(heading)}</h1>
${p(greeting(t, user))}
${paragraphs.map((text) => p(text)).join("\n")}
<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:8px;">${escapeHtml(button)}</a></p>
${smallPrint.map((text) => p(text, "font-size:13px;color:#525252;")).join("\n")}
${p(t("linkFallback"), "font-size:13px;color:#525252;margin-bottom:4px;")}
<p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${escapeHtml(url)}" style="color:#c2410c;">${escapeHtml(url)}</a></p>
<p style="margin:0;font-size:12px;color:#737373;border-top:1px solid #e5e5e5;padding-top:16px;">${escapeHtml(t("footer"))}</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    const text = [
        greeting(t, user),
        "",
        heading,
        "",
        ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
        `${button}: ${url}`,
        "",
        ...smallPrint.flatMap((paragraph) => [paragraph, ""]),
        "--",
        t("footer"),
    ].join("\n");

    return { html, text };
}

export async function verificationEmail({ user, url }) {
    const t = await emailTranslator(user.locale);
    return {
        to: user.email,
        subject: t("verify.subject"),
        ...render(t, {
            user,
            heading: t("verify.heading"),
            paragraphs: [t("verify.body")],
            button: t("verify.button"),
            url,
            smallPrint: [t("verify.expiry"), t("verify.ignore")],
        }),
    };
}

export async function resetPasswordEmail({ user, url }) {
    const t = await emailTranslator(user.locale);
    return {
        to: user.email,
        subject: t("reset.subject"),
        ...render(t, {
            user,
            heading: t("reset.heading"),
            paragraphs: [t("reset.body")],
            button: t("reset.button"),
            url,
            smallPrint: [t("reset.expiry"), t("reset.ignore")],
        }),
    };
}

// url: the forgot-password page, for the case where it wasn't the user
export async function passwordChangedEmail({ user, url }) {
    const t = await emailTranslator(user.locale);
    return {
        to: user.email,
        subject: t("passwordChanged.subject"),
        ...render(t, {
            user,
            heading: t("passwordChanged.heading"),
            paragraphs: [t("passwordChanged.body"), t("passwordChanged.notYou")],
            button: t("passwordChanged.button"),
            url,
        }),
    };
}
