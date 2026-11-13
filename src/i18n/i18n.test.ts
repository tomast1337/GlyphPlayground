import {expect, test} from "bun:test";
import en from "./en";
import {pickLocale} from "./index";

test("every key the pages use exists in English", async () => {
    // The pages, and the guide's page template
    const root = `${import.meta.dir}/../..`;
    const files = [...new Bun.Glob("src/**/*.html").scanSync({cwd: root}), "tools/learn.ts"];
    const sources = await Promise.all(files.map(f => Bun.file(`${root}/${f}`).text()));
    const keys = sources.flatMap(text => [...text.matchAll(/data-i18n(?:-[\w-]+)?="([^"$]+)"/g)].map(m => m[1]!));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(en).toHaveProperty([key]);
});

test("picks the first language available, by region or base", () => {
    expect(pickLocale(["pt-BR", "lt"], ["lt", "pt"])).toBe("pt");
    expect(pickLocale(["de", "LT"], ["lt"])).toBe("lt");
    expect(pickLocale(["de"], ["lt"])).toBe("en");
});
