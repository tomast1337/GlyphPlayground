import {embed, startExamples} from "./embed";
import {loadLocale} from "./i18n";
import {encode} from "./share";

// The banner: plain JavaScript, so it runs as is and opens in the playground as JavaScript
const BANNER = `const RAMP = ' .:-=+*#%@';

export function main(coord, context, cursor, out) {
    const t = context.time * 0.0008;
    const x = coord.x * 0.08;
    const y = coord.y * 0.16;
    // Four overlapping waves, -4..4, then 0..1
    const v = Math.sin(x + t) + Math.sin(y - t) + Math.sin(x + y + t) + Math.sin(Math.hypot(x - 6, y - 4) - t * 2);
    const n = (v + 4) / 8;
    out.char = RAMP[Math.floor(n * (RAMP.length - 1))];
    out.color.r = 80 + n * 175;
    out.color.g = 40 + n * 120;
    out.color.b = 255 - n * 120;
}
`;

await loadLocale();
startExamples();

const errors = document.querySelector<HTMLElement>("#banner-errors")!;
embed(document.querySelector<HTMLIFrameElement>("#banner")!, "./runner.html", BANNER, message => errors.textContent += `${message}\n`);
document.querySelector<HTMLAnchorElement>("#banner-edit")!.href = `./play/#c=${await encode(BANNER)}`;
