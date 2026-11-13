import {expect, test} from "bun:test";
import {renderChapter} from "./learn";

test("the first heading is the chapter's title, without its markup", () => {
    expect(renderChapter("# Hi <em>there</em> &amp; you\n\nText").title).toBe("Hi there & you");
});

test("a chapter without a title fails the build", () => {
    expect(() => renderChapter("no title")).toThrow("# title");
});
