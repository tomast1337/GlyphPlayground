import {expect, test} from "bun:test";
import {decode} from "../src/share";
import {highlight, renderChapter} from "./learn";

test("a glyph block becomes a live example with its JavaScript and a playground link", async () => {
    const source = "export function main(c: { x: number }, x, y, out) {\n    out.char = c.x < 2 ? '<' : '&';\n}";
    const {title, html} = await renderChapter(`# Hi <em>there</em>\n\n\`\`\`glyph\n${source}\n\`\`\`\n`);
    expect(title).toBe("Hi there");

    const code = html.match(/data-code="([^"]*)"/)![1]!;
    expect(code).not.toContain(": {"); // types removed
    expect(code).toContain("&lt;"); // escaped for the attribute

    const link = html.match(/href="\.\.\/play\/#t=([\w-]+)"/)![1]!;
    expect(await decode(link)).toBe(source); // the playground gets the TypeScript as written
});

test("ts blocks are highlighted, other blocks left alone", async () => {
    const {html} = await renderChapter("# T\n\n```ts\nconst a = 1;\n```\n\n```sh\nnpm i x\n```\n");
    expect(html).toContain('<span class="tok-keyword">const</span>');
    expect(html).toContain('<code class="language-sh">npm i x');
});

test("highlighting escapes the code", () => {
    expect(highlight("'<b>'")).toBe('<span class="tok-string">\'&lt;b&gt;\'</span>');
});

test("a chapter without a title fails the build", async () => {
    await expect(renderChapter("no title")).rejects.toThrow("# title");
});
