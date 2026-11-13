// Turns the guide's chapters (learn/NN-slug.md) into HTML pages, which the site build then bundles.
// NN orders the chapters; the first "# heading" is the title. Code blocks are left to tools/code.ts,
// which the build runs on every page.
import {mkdir, readdir} from "node:fs/promises";
import {escape, unescape} from "./code";

export type Chapter = {slug: string; title: string; html: string};

export function renderChapter(markdown: string) {
    const html = Bun.markdown.html(markdown);
    const title = unescape(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]*>/g, "") ?? "");
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
        <a class="icon icon-book" href="./" aria-current="page" data-i18n="nav.learn">Learn</a>
        <a class="icon icon-play" href="../play/" data-i18n="nav.play">Playground</a>
        <a class="icon icon-github" href="https://github.com/tomast1337/GlyphEngine">GitHub</a>
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

// Writes the pages into out and returns their paths, for Bun.build
export async function buildLearn(out: string, source = "learn") {
    await mkdir(out, {recursive: true});

    const files = (await readdir(source)).filter(f => /^\d+-.+\.md$/.test(f)).sort();
    const chapters: Chapter[] = [];
    for (const file of files) {
        try {
            chapters.push({slug: file.replace(/^\d+-|\.md$/g, ""), ...renderChapter(await Bun.file(`${source}/${file}`).text())});
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
