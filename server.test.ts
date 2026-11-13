import {expect, test} from "bun:test";
import {existsSync} from "node:fs";
import {handle} from "./server";

const get = (path: string, init?: RequestInit) => handle(new Request(`http://x${path}`, init));

test("health and traversal", async () => {
    expect((await get("/healthz")).status).toBe(200);
    expect((await get("/..%2f..%2fetc%2fpasswd")).status).toBe(404);
    expect((await get("/%2e%2e/server.ts")).status).toBe(404);
    expect((await get("/%E0%A4%A")).status).toBe(400);
    expect((await get("/nope.js")).status).toBe(404);
});

test("security headers on every response; the runner may only be framed by the site, sandboxed", async () => {
    for (const res of await Promise.all([get("/healthz"), get("/nope.js"), get("/%E0%A4%A")])) {
        expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
        expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=");
        expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    }
});

test("only GET and HEAD", async () => {
    const res = await get("/", {method: "POST"});
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, HEAD");
    expect((await get("/healthz", {method: "HEAD"})).status).toBe(200);
});

// Needs a build: dist/ is not committed
test.skipIf(!existsSync(`${import.meta.dir}/dist/play/index.html`))("folders, caching and 304", async () => {
    const play = await get("/play?lang=pt");
    expect(play.status).toBe(301);
    expect(play.headers.get("Location")).toBe("/play/?lang=pt");

    // Redirects stay on this site, whatever the path's spelling
    for (const path of ["//example.com/..%2Flearn", "//learn", "/%2Flearn"]) {
        expect((await get(path)).headers.get("Location")).toBe("/learn/");
    }
    // The runner is sandboxed however its URL is spelled
    for (const path of ["/runner.html", "//runner.html", "/%72unner.html"]) {
        expect((await get(path)).headers.get("Content-Security-Policy")).toBe("sandbox allow-scripts; frame-ancestors 'self'");
    }

    const page = await get("/");
    expect(page.headers.get("Cache-Control")).toBe("no-cache");
    expect((await get("/runner.html")).headers.get("Cache-Control")).toBe("no-cache");

    const chunk = (await page.text()).match(/\/(chunk-[\w-]+\.js)/)![1];
    expect((await get(`/${chunk}`)).headers.get("Cache-Control")).toContain("immutable");
    for (const [, name] of (await (await get("/runner.html")).text()).matchAll(/\.\/((engine|runner)-\w+\.js)/g)) {
        expect((await get(`/${name}`)).status).toBe(200);
        expect((await get(`/${name}`)).headers.get("Cache-Control")).toContain("immutable");
    }

    const at = (since: string) => get("/", {headers: {"If-Modified-Since": since}});
    const modified = page.headers.get("Last-Modified")!;
    expect((await at(modified)).status).toBe(304);
    expect((await at("Thu, 01 Jan 1970 00:00:00 GMT")).status).toBe(200);
    expect((await at("not a date")).status).toBe(200);
});
