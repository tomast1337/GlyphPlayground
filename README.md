# GlyphEngine Playground

Write [GlyphEngine](https://github.com/tomast1337/GlyphEngine) programs in the browser, run them, and share them as a link.

```sh
bun install
bun run dev     # build, then serve on http://localhost:3000
bun test        # share-link encoding
bun run check   # types
```

`bun run build` writes a static site to `dist/`; `bun start` serves it.

## How it works

- Programs are TypeScript or JavaScript (the selector next to Run), edited with CodeMirror. TypeScript goes through [Sucrase](https://github.com/alangpierce/sucrase), which only removes the types (no type checking); it loads on first use.
- A program is a module exporting `main`, `pre`, `post`, `settings`… (see [Writing programs](https://github.com/tomast1337/GlyphEngine/blob/main/docs/programs.md)). It imports the engine as `@glyph-engine/web` or `@glyph-engine/core`; an import map points both at `dist/engine.js`.
- Each run reloads `runner.html` in an iframe with `sandbox="allow-scripts"` and no `allow-same-origin`, so a shared program can't read the playground's page, storage or cookies. Code and errors cross with `postMessage`.
- **Copy link** puts the program in the URL hash (`#t=` TypeScript, `#c=` JavaScript), compressed with deflate-raw and encoded as base64url. The hash never reaches the server, so there is no backend.

## Translations

Interface text lives in `src/i18n/`. `en.ts` has every key; to add a language, copy it to `<code>.ts` (e.g. `pt.ts`), translate what you can (missing keys show in English), and add it to `LOCALES` in `src/i18n/index.ts`. Visitors get the first of their browser's languages that exists; `?lang=pt` forces one. In HTML, `data-i18n="key"` sets an element's text and `data-i18n-<attribute>="key"` an attribute.

## Hosting

Any static host works, as long as it sends `Access-Control-Allow-Origin: *` for `engine.js`: the sandboxed iframe has an opaque origin, so its module loads are cross-origin. GitHub Pages and `server.ts` send it.
