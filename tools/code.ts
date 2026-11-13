// Code blocks in every page, at build time: <pre><code class="language-X">, as written in the HTML pages
// or produced from Markdown. No JavaScript in the page for any of it.
// - glyph: a live example. Highlighted TypeScript, its output in the sandboxed runner, a playground link.
// - ts, js: highlighted; programs (they import @glyph-engine) also get a playground link.
// - sh: highlighted.
// Other languages are left as they are.
import {typescriptLanguage} from "@codemirror/lang-javascript";
import {StreamLanguage} from "@codemirror/language";
import {shell} from "@codemirror/legacy-modes/mode/shell";
import {classHighlighter, highlightCode} from "@lezer/highlight";
import {transform} from "sucrase";
import {encode} from "../src/share";

export const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
export const unescape = (s: string) => s.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&amp;", "&");

const PARSERS = {ts: typescriptLanguage.parser, sh: StreamLanguage.define(shell).parser};
const LANGS: Record<string, keyof typeof PARSERS> = {glyph: "ts", ts: "ts", typescript: "ts", js: "ts", javascript: "ts", sh: "sh", bash: "sh", shell: "sh"};

// Classes only, coloured by base.css
export function highlight(code: string, lang: keyof typeof PARSERS = "ts") {
    let html = "";
    highlightCode(code, PARSERS[lang].parse(code), classHighlighter,
        (text, classes) => html += classes ? `<span class="${classes}">${escape(text)}</span>` : escape(text),
        () => html += "\n");
    return `<pre class="${lang}"><code>${html}</code></pre>`;
}

// root: the path from the page to the site root ("./", "../")
async function playLink(code: string, typescript: boolean, root: string) {
    return `<a class="play" href="${root}play/#${typescript ? "t" : "c"}=${await encode(code)}" data-i18n="example.open">Run in playground</a>`;
}

async function block(lang: string, code: string, root: string) {
    const kind = LANGS[lang];
    if (lang === "glyph") {
        const js = transform(code, {transforms: ["typescript"], disableESTransforms: true}).code;
        return `<figure class="example" data-code="${escape(js)}" data-runner="${root}runner.html">
${highlight(code)}
<iframe sandbox="allow-scripts" loading="lazy" data-i18n-title="example.output"></iframe>
<figcaption>${await playLink(code, true, root)}</figcaption>
<pre class="errors" role="alert"></pre>
</figure>`;
    }
    if (kind === "ts" && /from\s+['"]@glyph-engine\//.test(code)) {
        return `<div class="code">${highlight(code)}${await playLink(code, lang.startsWith("t"), root)}</div>`;
    }
    return kind ? highlight(code, kind) : undefined;
}

export async function renderCodeBlocks(html: string, root: string) {
    for (const [whole, lang, body] of html.matchAll(/<pre><code class="language-([\w-]+)">([\s\S]*?)<\/code><\/pre>/g)) {
        const replacement = await block(lang!, unescape(body!).replace(/\n$/, ""), root);
        if (replacement) html = html.replace(whole, () => replacement);
    }
    return html;
}
