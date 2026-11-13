// Translations. To add a language: copy en.ts to <code>.ts (e.g. pt.ts), translate, and list it in LOCALES.
// HTML elements (<title> too) name their text with data-i18n="key", and attributes with data-i18n-<attribute>="key".
import en from "./en";

export type Key = keyof typeof en;
export type Messages = Partial<Record<Key, string>>;

// Loaded on demand, so each visitor downloads only their language
const LOCALES: Record<string, () => Promise<{default: Messages}>> = {
    lt: () => import("./lt"),
    pt: () => import("./pt"),
};

let messages: Messages = {};

export const t = (key: Key) => messages[key] ?? en[key];

// The first of the browser's languages we have, matching "pt-BR" to "pt" too. ?lang=xx overrides, for testing.
export function pickLocale(wanted: readonly string[], available = Object.keys(LOCALES)) {
    for (const tag of wanted) {
        const lower = tag.toLowerCase();
        const match = available.find(a => a.toLowerCase() === lower) ?? available.find(a => a.toLowerCase() === lower.split("-")[0]);
        if (match) return match;
    }
    return "en";
}

export async function loadLocale() {
    const forced = new URLSearchParams(location.search).get("lang");
    const locale = pickLocale(forced ? [forced] : navigator.languages);
    if (locale !== "en") messages = (await LOCALES[locale]!()).default;
    document.documentElement.lang = locale;
    for (const el of document.querySelectorAll<HTMLElement>("*")) {
        for (const {name, value} of [...el.attributes]) {
            if (name === "data-i18n") el.textContent = t(value as Key);
            else if (name.startsWith("data-i18n-")) el.setAttribute(name.slice("data-i18n-".length), t(value as Key));
        }
    }
}
