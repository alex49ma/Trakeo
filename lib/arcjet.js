import arcjet, { detectBot, shield } from '@arcjet/next';

export const aj = arcjet({
    key: process.env.ARCJET_KEY,
    rules: [
        shield({
            mode: 'LIVE'
        }),
        detectBot({
            mode: "LIVE",
            allow: [
                "CATEGORY:SEARCH_ENGINE", "GO_HTTP"
            ]
        })
    ],
});