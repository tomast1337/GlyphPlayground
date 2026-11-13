// Builds the site into dist/, replacing what was there. --serve starts the server after.
// src/ is copied to .build/src/ with the guide's pages added and every page's code blocks rendered
// (tools/code.ts), and that copy is bundled.
import {cp, rm} from "node:fs/promises";
import {dirname, relative} from "node:path";
import {renderCodeBlocks} from "./code";
import {buildLearn} from "./learn";

const outdir = "dist";
const stage = ".build/src";
await Promise.all([rm(outdir, {recursive: true, force: true}), rm(stage, {recursive: true, force: true})]);
await cp("src", stage, {recursive: true});
await buildLearn(`${stage}/learn`);

const pages = [...new Bun.Glob("**/*.html").scanSync(stage)].filter(p => !p.startsWith("runner/")).map(p => `${stage}/${p}`);
for (const page of pages) {
    const root = relative(dirname(page), stage) || ".";
    await Bun.write(page, await renderCodeBlocks(await Bun.file(page).text(), `${root}/`));
}

const builds = await Promise.all([
    Bun.build({entrypoints: pages, root: stage, outdir, minify: true, splitting: true}), // splitting: Sucrase and languages load on demand
    // One file for the engine: the runner's import map points programs at it
    Bun.build({entrypoints: [Bun.resolveSync("@glyph-engine/web", import.meta.dir)], outdir, naming: "engine-[hash].[ext]", minify: true, target: "browser"}),
]);

for (const build of builds) {
    if (!build.success) {
        for (const log of build.logs) console.error(log);
        process.exit(1);
    }
}

// The runner is copied, not bundled (bundling would pull in a second copy of the engine), with hashed
// names for its script and the engine like Bun's chunks, so browsers and Cloudflare may cache them for good.
const engine = builds[1]!.outputs[0]!.path.split("/").pop()!;
const runnerJs = await Bun.file("src/runner/runner.js").text();
const runner = `runner-${Bun.hash(runnerJs).toString(36).slice(0, 8)}.js`;
await Bun.write(`${outdir}/${runner}`, runnerJs);
const runnerHtml = (await Bun.file("src/runner/runner.html").text()).replaceAll("./engine.js", `./${engine}`).replace("./runner.js", `./${runner}`);
if (!runnerHtml.includes(engine) || !runnerHtml.includes(runner)) throw new Error("runner.html no longer names ./engine.js and ./runner.js");
await Bun.write(`${outdir}/runner.html`, runnerHtml);

if (process.argv.includes("--serve")) (await import("../server.ts")).serve();
