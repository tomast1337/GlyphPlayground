import {decode, encode} from "./share";

const DEFAULT_PROGRAM = `import { drawbox } from '@glyph-engine/web';

// main() runs once per cell, every frame, like a fragment shader.
export function main(coord, context, cursor, out) {
    const v = Math.sin(coord.x * 0.1 + context.time * 0.001); // -1..1
    out.char = v > 0 ? '#' : '.';
    out.color = 'white';
    out.background.r = (v + 1) * 127;
    out.background.b = 128;
}

// post() runs once per frame, after the cells.
export function post(context, cursor, buffer) {
    drawbox.drawInfo(context, cursor, buffer);
}
`;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const code = $<HTMLTextAreaElement>("#code");
const output = $<HTMLIFrameElement>("#output");
const errors = $("#errors");
const status = $("#status");

addEventListener("message", e => {
    if (e.source !== output.contentWindow) return;
    // The iframe's origin is opaque, so "*" is the only target that reaches it
    if (e.data?.type === "ready") output.contentWindow!.postMessage({code: code.value}, "*");
    if (e.data?.type === "error") errors.textContent += `${e.data.message}\n`;
});

function run() {
    errors.textContent = "";
    output.src = "runner.html"; // reloads even when unchanged
}

async function share() {
    history.replaceState(null, "", `#c=${await encode(code.value)}`);
    try {
        await navigator.clipboard.writeText(location.href);
        status.textContent = "Link copied";
    } catch {
        status.textContent = "Link is in the address bar";
    }
}

let escaped = false; // Esc then Tab leaves the editor, so keyboard users aren't trapped
code.addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        run();
    } else if (e.key === "Tab" && !escaped && !e.shiftKey) {
        e.preventDefault();
        document.execCommand("insertText", false, "    "); // keeps undo, unlike setRangeText
    }
    escaped = e.key === "Escape";
});
code.addEventListener("input", () => status.textContent = "");
$("#run").addEventListener("click", run);
$("#share").addEventListener("click", share);

code.value = DEFAULT_PROGRAM;
if (location.hash.startsWith("#c=")) {
    try {
        code.value = await decode(location.hash.slice(3));
    } catch {
        errors.textContent = "This link's program is damaged; showing the default one.\n";
    }
}
run();
