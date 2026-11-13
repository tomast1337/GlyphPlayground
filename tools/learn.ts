// Turns the guide's chapters (learn/NN-slug.md) into HTML pages in src/learn/ (generated, gitignored),
// which the site build then bundles. NN orders the chapters; the first "# heading" is the title.
// A ```glyph code block (TypeScript) becomes a live example: highlighted code, its output, and a playground link.
import {typescriptLanguage} from "@codemirror/lang-javascript";
import {classHighlighter, highlightCode} from "@lezer/highlight";
import {mkdir, readdir, rm} from "node:fs/promises";
import {transform} from "sucrase";
import {encode} from "../src/share";

export type Chapter = {slug: string; title: string; html: string};

const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const unescape = (s: string) => s.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&amp;", "&");
const stripTags = (s: string) => unescape(s.replace(/<[^>]*>/g, ""));

// Syntax highlighting at build time: classes only, coloured by base.css, no JavaScript in the page
export function highlight(code: string) {
    let html = "";
    highlightCode(code, typescriptLanguage.parser.parse(code), classHighlighter,
        (text, classes) => html += classes ? `<span class="${classes}">${escape(text)}</span>` : escape(text),
        () => html += "\n");
    return html;
}

async function example(code: string) {
    const js = transform(code, {transforms: ["typescript"], disableESTransforms: true}).code;
    return `<figure class="example" data-code="${escape(js)}">
<pre><code>${highlight(code)}</code></pre>
<iframe sandbox="allow-scripts" loading="lazy" data-i18n-title="example.output"></iframe>
<figcaption><a href="../play/#t=${await encode(code)}" data-i18n="example.open">Open in playground</a></figcaption>
<pre class="errors" role="alert"></pre>
</figure>`;
}

export async function renderChapter(markdown: string) {
    let html = Bun.markdown.html(markdown);
    for (const [block, lang, body] of html.matchAll(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g)) {
        const code = unescape(body!).replace(/\n$/, "");
        const replacement = lang === "glyph" ? await example(code)
            : /^(ts|js|typescript|javascript)$/.test(lang!) ? `<pre><code>${highlight(code)}</code></pre>`
            : block;
        html = html.replace(block, () => replacement);
    }
    const title = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
    if (!title) throw new Error("a chapter needs a # title");
    return {title, html};
}

function page(title: string, body: string, chapters: Chapter[], current?: string) {
    const list = chapters.map(c => `<li><a href="${c.slug}.html"${c.slug === current ? ' aria-current="page"' : ""}>${escape(c.title)}</a></li>`).join("\n");
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escape(title)} · GlyphEngine</title>
    <link rel="stylesheet" href="../base.css">
    <link rel="stylesheet" href="../learn.css">
</head>
<body>
    <header class="site">
        <a class="brand" href="../">GlyphEngine</a>
        <a href="./" aria-current="page" data-i18n="nav.learn">Learn</a>
        <a href="../play/" data-i18n="nav.play">Playground</a>
        <a href="https://github.com/tomast1337/GlyphEngine">GitHub</a>
    </header>
    <div class="learn">
        <nav class="chapters" aria-labelledby="chapters-title">
            <h2 id="chapters-title"><a href="./" data-i18n="learn.chapters">Chapters</a></h2>
            <ol>${list}</ol>
        </nav>
        <main>${body}</main>
    </div>
    <script type="module" src="../learn.ts"></script>
</body>
</html>
`;
}

function pager(prev?: Chapter, next?: Chapter) {
    const link = (c: Chapter | undefined, rel: string, key: string) =>
        c ? `<a rel="${rel}" href="${c.slug}.html"><span data-i18n="${key}"></span><br>${escape(c.title)}</a>` : "<span></span>";
    return `<nav class="pager">${link(prev, "prev", "learn.prev")}${link(next, "next", "learn.next")}</nav>`;
}

// Writes the pages and returns their paths, for Bun.build
export async function buildLearn(source = "learn", out = "src/learn") {
    await rm(out, {recursive: true, force: true});
    await mkdir(out, {recursive: true});

    const files = (await readdir(source)).filter(f => /^\d+-.+\.md$/.test(f)).sort();
    const chapters: Chapter[] = [];
    for (const file of files) {
        try {
            chapters.push({slug: file.replace(/^\d+-|\.md$/g, ""), ...await renderChapter(await Bun.file(`${source}/${file}`).text())});
        } catch (e) {
            throw new Error(`${source}/${file}: ${e instanceof Error ? e.message : e}`);
        }
    }

    const paths = [`${out}/index.html`];
    const toc = chapters.map(c => `<li><a href="${c.slug}.html">${escape(c.title)}</a></li>`).join("\n");
    await Bun.write(paths[0]!, page("Learn", `<h1 data-i18n="learn.title">Learn GlyphEngine</h1>\n<p data-i18n="learn.intro"></p>\n<ol class="toc">${toc}</ol>`, chapters));
    for (const [i, c] of chapters.entries()) {
        const path = `${out}/${c.slug}.html`;
        await Bun.write(path, page(c.title, `<article>${c.html}</article>${pager(chapters[i - 1], chapters[i + 1])}`, chapters, c.slug));
        paths.push(path);
    }
    return paths;
}
