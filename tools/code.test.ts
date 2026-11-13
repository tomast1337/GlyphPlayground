import {expect, test} from "bun:test";
import {decode} from "../src/share";
import {highlight, renderCodeBlocks} from "./code";

const block = (lang: string, code: string) => `<pre><code class="language-${lang}">${code.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}\n</code></pre>`;
const link = (html: string) => html.match(/href="\.\.\/play\/#(\w)=([\w-]+)"/);

test("a glyph block becomes a live example: its JavaScript, the runner, a playground link", async () => {
    const source = "export function main(c: { x: number }, x, y, out) {\n    out.char = c.x < 2 ? '<' : '&';\n}";
    const html = await renderCodeBlocks(block("glyph", source), "../");

    const code = html.match(/data-code="([^"]*)"/)![1]!;
    expect(code).not.toContain(": {"); // types removed
    expect(code).toContain("&lt;"); // escaped for the attribute
    expect(html).toContain('data-runner="../runner.html"');

    const [, lang, hash] = link(html)!;
    expect(lang).toBe("t");
    expect(await decode(hash!)).toBe(source); // the playground gets the TypeScript as written
});

test("ts and js programs get a playground link in their language; other code doesn't", async () => {
    const program = "import { run } from '@glyph-engine/web';\nrun({});";
    expect(link(await renderCodeBlocks(block("ts", program), "../"))![1]).toBe("t");
    expect(link(await renderCodeBlocks(block("js", program), "../"))![1]).toBe("c");

    const snippet = await renderCodeBlocks(block("ts", "const a = 1;"), "../");
    expect(link(snippet)).toBeNull();
    expect(snippet).toContain('<span class="tok-keyword">const</span>');
});

test("sh is highlighted, unknown languages are left alone", async () => {
    expect(await renderCodeBlocks(block("sh", "npm install x # y"), "./")).toContain('<span class="tok-comment"># y</span>');
    const css = block("css", "a { color: red }");
    expect(await renderCodeBlocks(css, "./")).toBe(css);
});

test("highlighting escapes the code", () => {
    expect(highlight("'<b>'")).toBe('<pre class="ts"><code><span class="tok-string">\'&lt;b&gt;\'</span></code></pre>');
});
