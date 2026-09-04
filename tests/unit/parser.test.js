import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePublishOutput, buildPackageUrl } from "../../src/parser.js";

describe("parsePublishOutput", () => {
  it("parses the standard success line", () => {
    const result = parsePublishOutput("✓ Published @example/my-ext@1.0.0");
    assert.deepStrictEqual(result, {
      owner: "@example",
      id: "my-ext",
      version: "1.0.0",
      status: "published",
    });
  });

  it("parses the pending-review success line", () => {
    const result = parsePublishOutput(
      "✓ Published @my-org/cool-extension@0.1.0 (pending review — this is your first publish)",
    );
    assert.deepStrictEqual(result, {
      owner: "@my-org",
      id: "cool-extension",
      version: "0.1.0",
      status: "pending",
    });
  });

  it("parses output with ANSI escapes stripped", () => {
    // Simulate the output after stripping ANSI codes
    const result = parsePublishOutput("✓ Published @org/pkg@2.3.4");
    assert.deepStrictEqual(result, {
      owner: "@org",
      id: "pkg",
      version: "2.3.4",
      status: "published",
    });
  });

  it("handles ids with dots and hyphens", () => {
    const result = parsePublishOutput("✓ Published @user/my.cool-ext-name@1.2.3");
    assert.deepStrictEqual(result, {
      owner: "@user",
      id: "my.cool-ext-name",
      version: "1.2.3",
      status: "published",
    });
  });

  it("extracts from multi-line output", () => {
    const output = [
      "Compiling extension...",
      "Build complete.",
      "✓ Published @owner/ext@1.0.0",
      "",
    ].join("\n");
    const result = parsePublishOutput(output);
    assert.deepStrictEqual(result, {
      owner: "@owner",
      id: "ext",
      version: "1.0.0",
      status: "published",
    });
  });

  it("returns null for unmatched output (future compiler version)", () => {
    const result = parsePublishOutput("Done! Your extension has been uploaded to the registry.");
    assert.strictEqual(result, null);
  });

  it("returns null for failure output", () => {
    const result = parsePublishOutput("Error: Version 1.0.0 already exists for @org/pkg");
    assert.strictEqual(result, null);
  });

  it("returns null for empty output", () => {
    assert.strictEqual(parsePublishOutput(""), null);
    assert.strictEqual(parsePublishOutput("\n\n"), null);
  });
});

describe("buildPackageUrl", () => {
  it("builds URL from owner and id", () => {
    const url = buildPackageUrl("https://warp.sdisk.us", "@example", "my-ext");
    assert.strictEqual(url, "https://warp.sdisk.us/v2/@example/my-ext");
  });

  it("strips trailing slashes from registry URL", () => {
    const url = buildPackageUrl("https://warp.sdisk.us///", "@owner", "pkg");
    assert.strictEqual(url, "https://warp.sdisk.us/v2/@owner/pkg");
  });

  it("handles ids with dots", () => {
    const url = buildPackageUrl("https://warp.sdisk.us", "@user", "my.cool.ext");
    assert.strictEqual(url, "https://warp.sdisk.us/v2/@user/my.cool.ext");
  });

  it("handles ids with hyphens", () => {
    const url = buildPackageUrl("https://warp.sdisk.us", "@user", "my-cool-ext");
    assert.strictEqual(url, "https://warp.sdisk.us/v2/@user/my-cool-ext");
  });

  it("handles ids with dots and hyphens", () => {
    const url = buildPackageUrl("https://warp.sdisk.us", "@org", "some.weird-ext.name");
    assert.strictEqual(url, "https://warp.sdisk.us/v2/@org/some.weird-ext.name");
  });

  it("works with custom registry URL", () => {
    const url = buildPackageUrl("https://my-registry.example.com", "@owner", "ext");
    assert.strictEqual(url, "https://my-registry.example.com/v2/@owner/ext");
  });
});
