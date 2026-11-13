// Builds the playground into dist/, replacing what was there. --serve starts the server after.
import {cp, rm} from "node:fs/promises";

const outdir = "dist";
await rm(outdir, {recursive: true, force: true});

const builds = await Promise.all([
    Bun.build({entrypoints: ["./src/index.html"], outdir, minify: true}),
    // One unhashed file: the runner's import map and user programs load the engine by this name
    Bun.build({entrypoints: [Bun.resolveSync("@glyph-engine/web", import.meta.dir)], outdir, naming: "engine.js", minify: true, target: "browser"}),
]);

for (const build of builds) {
    if (!build.success) {
        for (const log of build.logs) console.error(log);
        process.exit(1);
    }
}

// The runner is copied as is: bundling it would pull in a second copy of the engine
await cp("src/runner", outdir, {recursive: true});

if (process.argv.includes("--serve")) await import("../server.ts");
