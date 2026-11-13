// Programs travel in the URL hash, which the browser never sends to the server:
// deflate-raw (built into browsers; Brotli is not, everywhere), then base64url.

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

export async function encode(text: string) {
    const bytes = await pipe(new TextEncoder().encode(text), new CompressionStream("deflate-raw"));
    return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(""))
        .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

// Throws on a damaged link
export async function decode(hash: string) {
    const binary = atob(hash.replaceAll("-", "+").replaceAll("_", "/"));
    const bytes = await pipe(Uint8Array.from(binary, c => c.charCodeAt(0)), new DecompressionStream("deflate-raw"));
    return new TextDecoder().decode(bytes);
}
