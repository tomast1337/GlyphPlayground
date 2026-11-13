import {expect, test} from "bun:test";
import {decode, encode} from "./share";

test("a program survives the round trip through a link", async () => {
    const code = "export function main(coord) {\n    return '╱╲👩‍💻'[coord.x % 3];\n}\n".repeat(20);
    const hash = await encode(code);
    expect(hash).toMatch(/^[\w-]+$/); // URL-safe, no padding
    expect(hash.length).toBeLessThan(code.length);
    expect(await decode(hash)).toBe(code);
});

test("a damaged link throws", async () => {
    await expect(decode("not*base64")).rejects.toThrow();
});
