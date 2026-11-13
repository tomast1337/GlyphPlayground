// Serves dist/ for local use. The runner iframe is sandboxed (origin "null"), so its module
// loads are cross-origin: allow any origin, as GitHub Pages does.
import {resolve, sep} from "node:path";

const root = resolve(import.meta.dir, "dist");

function handle(req: Request) {
    const {pathname} = new URL(req.url);
    let path: string;
    try {
        path = resolve(root, `.${decodeURIComponent(pathname.endsWith("/") ? `${pathname}index.html` : pathname)}`);
    } catch {
        return new Response("Bad request", {status: 400});
    }
    if (!path.startsWith(root + sep)) return new Response("Not found", {status: 404});

    const file = Bun.file(path);
    if (!file.size) return new Response("Not found", {status: 404});

    return new Response(file, {headers: {"Access-Control-Allow-Origin": "*"}});
}

const server = Bun.serve({port: Number(process.env.PORT) || 3000, fetch: handle});
console.log(`listening on ${server.url}`);
