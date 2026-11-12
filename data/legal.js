// Facts the privacy page states (app/[locale]/privacy/page.jsx). Fill owner and contactEmail in before the page goes
// live: the GDPR asks for the controller's identity and contact (../SDD/better-auth-migration/, D31 and open item 9).
// While they're null the page says "the person who runs Trakeo" and points to the feedback button.
// Change `updated` whenever the policy's content changes.
export const PRIVACY = {
    owner: "Alejandro Martín Auden",
    contactEmail: "amartinauden@gmail.com",
    updated: "2026-11-11",
};
