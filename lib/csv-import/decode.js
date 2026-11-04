export const ENCODINGS = ["utf-8", "windows-1250", "windows-1252"];

/**
 * Turns the file's bytes into text. "auto" tries UTF-8 and, when the bytes aren't valid UTF-8, falls back to the
 * single-byte encoding banks of the language usually export: Windows-1250 (Central Europe) for Czech, Windows-1252
 * (Western Europe) otherwise. TextDecoder drops a UTF-8 BOM.
 * Returns { text, encoding }, with the encoding actually used.
 */
export function decodeBytes(buffer, encoding = "auto", locale = "en") {
    if (encoding !== "auto") return { text: new TextDecoder(encoding).decode(buffer), encoding };

    try {
        return { text: new TextDecoder("utf-8", { fatal: true }).decode(buffer), encoding: "utf-8" };
    } catch {
        const fallback = locale === "cs" ? "windows-1250" : "windows-1252";
        return { text: new TextDecoder(fallback).decode(buffer), encoding: fallback };
    }
}
