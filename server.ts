// Serves dist/ for local use. The runner iframe is sandboxed (origin "null"), so its module
// loads are cross-origin: allow any origin, as GitHub Pages does.
import {stat} from "node:fs/promises";
import {resolve, sep} from "node:path";

const root = resolve(import.meta.dir, "dist");

async function handle(req: Request) {
    const {pathname} = new URL(req.url);
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
    if (info.isDirectory()) return Response.redirect(`${pathname}/${new URL(req.url).search}`, 301);

    const file = Bun.file(path);

    return new Response(file, {headers: {"Access-Control-Allow-Origin": "*"}});
}

const server = Bun.serve({port: Number(process.env.PORT) || 3000, fetch: handle});
console.log(`listening on ${server.url}`);
