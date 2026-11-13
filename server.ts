// Serves dist/, locally (bun run dev) and in production (Railway).
import {stat} from "node:fs/promises";
import {join, relative, resolve, sep} from "node:path";

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
    "Cross-Origin-Opener-Policy": "same-origin",
    // The runner's sandbox grants none of these either
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), usb=(), payment=()",
    // The runner is sandboxed (origin "null"), so its loads of engine.js are cross-origin
    "Access-Control-Allow-Origin": "*",
};

export async function handle(req: Request) {
    const res = await route(req);
    for (const [name, value] of Object.entries(HEADERS)) res.headers.set(name, value);
    // route() sets the runner's own; everything else, errors included, gets the pages' one
    if (!res.headers.has("Content-Security-Policy")) res.headers.set("Content-Security-Policy", PAGE_CSP);
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
    // /play to /play/: the page's relative links only resolve with the slash.
    // Built from the resolved path, never the raw one: "//evil.example/..%2Flearn" must not redirect off-site.
    const canonical = `/${relative(root, path).split(sep).join("/")}`;
    if (info.isDirectory()) return new Response(null, {status: 301, headers: {Location: `${canonical}/${search}`}});

    // Every script and style has a hashed name (chunk-<hash>.js, engine-<hash>.js...), so it can be cached for good.
    // Pages keep their names: always revalidated.
    const cache = /-[a-z0-9]{8,}\.(js|css)$/.test(pathname) ? "public, max-age=31536000, immutable" : "no-cache";

    // HTTP dates have whole seconds: compare at that precision so an unchanged file gives 304
    const modified = Math.floor(info.mtimeMs / 1000) * 1000;
    const headers: Record<string, string> = {"Cache-Control": cache, "Last-Modified": new Date(modified).toUTCString()};
    // Chosen by the file, not the URL's spelling ("/%72unner.html", "//runner.html")
    if (path === join(root, "runner.html")) headers["Content-Security-Policy"] = RUNNER_CSP;
    if (Date.parse(req.headers.get("If-Modified-Since") ?? "") >= modified) return new Response(null, {status: 304, headers});

    return new Response(Bun.file(path), {headers});
}

export function serve() {
    const server = Bun.serve({port: Number(process.env.PORT) || 3000, fetch: handle});
    console.log(`listening on ${server.url}`);
}

if (import.meta.main) serve();
