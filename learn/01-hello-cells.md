# Hello, cells

GlyphEngine draws a grid of characters. Each square of the grid is a **cell**: one character, a text colour and a background colour.

You don't draw the grid yourself. You write one function, `main()`, that decides what a single cell looks like, and the engine calls it for every cell, every frame. If you have written a fragment shader, this is the same idea with characters instead of pixels.

## Your first program

```glyph
import type { CellOut, Context, Coord, Cursor } from '@glyph-engine/core';

export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
    out.char = (coord.x + coord.y) % 2 ? '#' : '.';
}
```

`coord` says which cell is being drawn: `coord.x` is its column and `coord.y` its row, both counting from 0 at the top left. `out` is the cell you are writing; here only its character changes.

Cells where the column plus the row is odd get a `#`, the others a `.`, so the grid turns into a checkerboard.

## Moving with time

`context` describes the whole frame. `context.time` is the time in milliseconds since the program started, so anything that depends on it moves.

```glyph
import type { CellOut, Context, Coord, Cursor } from '@glyph-engine/core';

export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
    const wave = Math.sin(coord.x * 0.2 + context.time * 0.002); // -1..1
    const height = (wave * 0.5 + 0.5) * context.rows;            // 0..rows
    out.char = coord.y > context.rows - height ? '█' : ' ';
}
```

`context.cols` and `context.rows` are the size of the grid. Each column computes its own wave height, and a cell is filled when it lies below it.

## Colour

`out.color` is the character's colour and `out.background` the cell's. Set them with any CSS colour, or channel by channel from 0 to 255:

```glyph
import type { CellOut, Context, Coord, Cursor } from '@glyph-engine/core';

export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
    const u = coord.x / context.cols; // 0..1, left to right
    const v = coord.y / context.rows; // 0..1, top to bottom
    out.char = ' ';
    out.background.r = u * 255;
    out.background.g = v * 255;
    out.background.b = 128;
}
```

Dividing by the grid size turns column and row into `u` and `v`, from 0 to 1, which keeps the picture the same whatever the size of the grid.

## Next

Change the numbers in the examples, or open one in the playground and break it. The [program reference](https://github.com/tomast1337/GlyphEngine/blob/main/docs/programs.md) lists everything `main()`, `context` and `out` offer.
