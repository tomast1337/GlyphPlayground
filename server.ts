// Serves dist/, locally (bun run dev) and in production (Railway).
import {stat} from "node:fs/promises";
import {resolve, sep} from "node:path";

const root = resolve(import.meta.dir, "dist");

// 'unsafe-inline' styles: CodeMirror adds its own. data: images: the icons in base.css.
const PAGE_CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
// The runner runs anyone's program: the header sandboxes it even if framed without the sandbox attribute,
// and only this site may frame it. Programs may load what they like (a blob: module, images...).
const RUNNER_CSP = "sandbox allow-scripts; frame-ancestors 'self'";

const HEADERS = {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // The runner is sandboxed (origin "null"), so its loads of engine.js are cross-origin
    "Access-Control-Allow-Origin": "*",
};

export async function handle(req: Request) {
    const res = await route(req);
    for (const [name, value] of Object.entries(HEADERS)) res.headers.set(name, value);
    const {pathname} = new URL(req.url);
    res.headers.set("Content-Security-Policy", pathname === "/runner.html" ? RUNNER_CSP : PAGE_CSP);
    return res;
}

async function route(req: Request) {
    if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET, HEAD"}});

    const {pathname, search} = new URL(req.url);
    if (pathname === "/healthz") return new Response("ok");

    let path: string;
    try {
        path = resolve(root, `.${decodeURIComponent(pathname.endsWith("/") ? `${pathname}index.html` : pathname)}`);
    } catch {
        return new Response("Bad request", {status: 400});
    }
    if (!path.startsWith(root + sep)) return new Response("Not found", {status: 404});

    const info = await stat(path).catch(() => null);
    if (!info) return new Response("Not found", {status: 404});
    // /play to /play/: the page's relative links only resolve with the slash
    if (info.isDirectory()) return new Response(null, {status: 301, headers: {Location: `${pathname}/${search}`}});

    // Bun hashes the bundle's chunks (chunk-<hash>.js/css), so they can be cached forever; the rest keeps its name.
    const cache = /^\/chunk-[\w-]+\.\w+$/.test(pathname) ? "public, max-age=31536000, immutable" : "no-cache";

    // HTTP dates have whole seconds: compare at that precision so an unchanged file gives 304
    const modified = Math.floor(info.mtimeMs / 1000) * 1000;
    const headers = {"Cache-Control": cache, "Last-Modified": new Date(modified).toUTCString()};
    if (Date.parse(req.headers.get("If-Modified-Since") ?? "") >= modified) return new Response(null, {status: 304, headers});

    return new Response(Bun.file(path), {headers});
}

export function serve() {
    const server = Bun.serve({port: Number(process.env.PORT) || 3000, fetch: handle});
    console.log(`listening on ${server.url}`);
}

if (import.meta.main) serve();
