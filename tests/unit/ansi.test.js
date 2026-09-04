import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stripAnsi } from "../../src/ansi.js";

describe("stripAnsi", () => {
  it("removes ANSI color codes", () => {
    const input = "\x1B[32m✓ Published\x1B[0m @owner/ext@1.0.0";
    assert.strictEqual(stripAnsi(input), "✓ Published @owner/ext@1.0.0");
  });

  it("removes bold codes", () => {
    const input = "\x1B[1mError:\x1B[0m something went wrong";
    assert.strictEqual(stripAnsi(input), "Error: something went wrong");
  });

  it("returns plain strings unchanged", () => {
    const input = "✓ Published @owner/ext@1.0.0";
    assert.strictEqual(stripAnsi(input), input);
  });

  it("handles empty strings", () => {
    assert.strictEqual(stripAnsi(""), "");
  });
});
