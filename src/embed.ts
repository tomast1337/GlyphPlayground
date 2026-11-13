// Runs JavaScript in a sandboxed runner iframe (see runner/runner.js); onError gets the program's errors.
// Sets the iframe's src last, so the runner can't say it's ready before we listen.
export function embed(frame: HTMLIFrameElement, runner: string, code: string, onError: (message: string) => void) {
    addEventListener("message", e => {
        if (e.source !== frame.contentWindow) return;
        // The iframe's origin is opaque, so "*" is the only target that reaches it
        if (e.data?.type === "ready") frame.contentWindow!.postMessage({code}, "*");
        if (e.data?.type === "error") onError(e.data.message);
    });
    frame.src = runner;
}
