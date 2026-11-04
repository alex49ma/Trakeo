// How names are compared: lowercase, without accents, single spaces ("Café " and "cafe" are equal)
export const normalizeName = (value) => String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * The text that groups rows by description: normalizeName without numbers, card masks or punctuation, so
 * "Google Pay deposit by *1721" and "Google Pay deposit by *2538" share the group "google pay deposit by".
 * A description made only of numbers keeps its plain normalized text.
 */
export function groupKey(value) {
    const name = normalizeName(value);
    const key = name
        .replace(/x{2,}(?=\d)/g, " ")
        .replace(/\d+/g, " ")
        .replace(/[^\p{L}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    return key || name;
}
