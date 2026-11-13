import {expect, test} from "bun:test";
import en from "./en";
import {pickLocale} from "./index";

test("every key the page uses exists in English", async () => {
    const html = await Bun.file(`${import.meta.dir}/../index.html`).text();
    const keys = [...html.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)].map(m => m[1]!);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(en).toHaveProperty([key]);
});

test("picks the first language available, by region or base", () => {
    expect(pickLocale(["pt-BR", "lt"], ["lt", "pt"])).toBe("pt");
    expect(pickLocale(["de", "LT"], ["lt"])).toBe("lt");
    expect(pickLocale(["de"], ["lt"])).toBe("en");
});
