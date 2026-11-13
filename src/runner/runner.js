// Runs one program inside the sandboxed iframe. The playground reloads this page for every run,
// so nothing from the last program (timers, listeners, state) survives.
import { run } from '@glyph-engine/web';

const report = message => parent.postMessage({ type: 'error', message: String(message) }, '*');
addEventListener('error', e => report(e.message));
addEventListener('unhandledrejection', e => report(e.reason));

addEventListener('message', async e => {
    if (e.source !== parent) return;
    const url = URL.createObjectURL(new Blob([e.data.code], { type: 'text/javascript' }));
    try {
        await run(await import(url));
    } catch (err) {
        report(err);
    }
}, { once: true });

parent.postMessage({ type: 'ready' }, '*');
