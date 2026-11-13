import {indentWithTab} from "@codemirror/commands";
import {javascript} from "@codemirror/lang-javascript";
import {Compartment, Prec} from "@codemirror/state";
import {oneDark} from "@codemirror/theme-one-dark";
import {keymap} from "@codemirror/view";
import {basicSetup, EditorView} from "codemirror";
import {loadLocale, t} from "./i18n";
import {decode, encode} from "./share";

await loadLocale();

type Lang = "ts" | "js";

// The link's prefix says the language; "#c=" (JavaScript) came first
const PREFIX: Record<Lang, string> = {ts: "#t=", js: "#c="};

const DEFAULT_PROGRAM = `import { drawbox } from '@glyph-engine/web';
import type { Buffer, CellOut, Context, Coord, Cursor } from '@glyph-engine/core';

// main() runs once per cell, every frame, like a fragment shader.
export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
    const v = Math.sin(coord.x * 0.1 + context.time * 0.001); // -1..1
    out.char = v > 0 ? '#' : '.';
    out.color = 'white';
    out.background.r = (v + 1) * 127;
    out.background.b = 128;
}

// post() runs once per frame, after the cells.
export function post(context: Context, cursor: Cursor, buffer: Buffer) {
    drawbox.drawInfo(context, cursor, buffer);
}
`;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const output = $<HTMLIFrameElement>("#output");
const errors = $("#errors");
const status = $("#status");
const select = $<HTMLSelectElement>("#lang");

let lang: Lang = "ts";
let compiled = ""; // what the runner gets: always JavaScript
const language = new Compartment();

const editor = new EditorView({
    parent: $("#code"),
    extensions: [
        basicSetup,
        language.of(javascript({typescript: true})),
        keymap.of([indentWithTab]),
        Prec.highest(keymap.of([{key: "Mod-Enter", run: () => (run(), true)}])),
        matchMedia("(prefers-color-scheme: dark)").matches ? oneDark : [],
        EditorView.contentAttributes.of({"aria-label": t("editor")}),
        EditorView.updateListener.of(u => {
            if (u.docChanged) status.textContent = "";
        }),
    ],
});

const source = () => editor.state.doc.toString();
const setSource = (text: string) => editor.dispatch({changes: {from: 0, to: editor.state.doc.length, insert: text}});

// Strips the types only, no type checking. Loaded on first use: JavaScript users never download it.
async function toJS(code: string) {
    const {transform} = await import("sucrase");
    return transform(code, {transforms: ["typescript"], disableESTransforms: true}).code;
}

function setLang(next: Lang) {
    lang = select.value = next;
    editor.dispatch({effects: language.reconfigure(javascript({typescript: next === "ts"}))});
}

addEventListener("message", e => {
    if (e.source !== output.contentWindow) return;
    // The iframe's origin is opaque, so "*" is the only target that reaches it
    if (e.data?.type === "ready") output.contentWindow!.postMessage({code: compiled}, "*");
    if (e.data?.type === "error") errors.textContent += `${e.data.message}\n`;
});

async function run() {
    errors.textContent = "";
    try {
        compiled = lang === "ts" ? await toJS(source()) : source();
    } catch (e) {
        errors.textContent = String(e); // a syntax error, with its line and column
        return;
    }
    output.src = "runner.html"; // reloads even when unchanged
}

async function share() {
    history.replaceState(null, "", `${PREFIX[lang]}${await encode(source())}`);
    try {
        await navigator.clipboard.writeText(location.href);
        status.textContent = t("share.copied");
    } catch {
        status.textContent = t("share.inAddressBar");
    }
}

select.addEventListener("change", async () => {
    const next = select.value as Lang;
    if (next === "js") {
        // TypeScript to JavaScript: drop the types so the program still runs. Kept as is if it doesn't parse.
        try {
            setSource(await toJS(source()));
        } catch {}
    }
    setLang(next);
    run();
});
$("#run").addEventListener("click", run);
$("#share").addEventListener("click", share);

setSource(DEFAULT_PROGRAM);
const shared = (Object.keys(PREFIX) as Lang[]).find(l => location.hash.startsWith(PREFIX[l]));
if (shared) {
    try {
        setSource(await decode(location.hash.slice(PREFIX[shared].length)));
        setLang(shared);
    } catch {
        errors.textContent = `${t("link.damaged")}\n`;
    }
}
run();
