import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePublishOutput, buildPackageUrl } from "../../src/parser.js";

describe("integration: parse + buildPackageUrl together", () => {
  it("full pipeline for a standard publish", () => {
    const stdout = "✓ Published @my-org/my-extension@1.2.3";
    const result = parsePublishOutput(stdout);

    assert.ok(result, "should parse the output");
    assert.strictEqual(result.owner, "@my-org");
    assert.strictEqual(result.id, "my-extension");
    assert.strictEqual(result.version, "1.2.3");
    assert.strictEqual(result.status, "published");

    const url = buildPackageUrl("https://warp.sdisk.us", result.owner, result.id);
    assert.strictEqual(url, "https://warp.sdisk.us/v2/@my-org/my-extension");
  });

  it("full pipeline for a pending-review publish", () => {
    const stdout =
      "✓ Published @alice/cool-blocks@0.1.0 (pending review — this is your first publish)";
    const result = parsePublishOutput(stdout);

    assert.ok(result, "should parse the output");
    assert.strictEqual(result.status, "pending");

    const url = buildPackageUrl("https://warp.sdisk.us", result.owner, result.id);
    assert.strictEqual(url, "https://warp.sdisk.us/v2/@alice/cool-blocks");
  });

  it("full pipeline for ids with dots and hyphens", () => {
    const stdout = "✓ Published @org/my.cool-ext-name@1.2.3";
    const result = parsePublishOutput(stdout);

    assert.ok(result, "should parse the output");
    assert.strictEqual(result.id, "my.cool-ext-name");

    const url = buildPackageUrl("https://warp.sdisk.us", result.owner, result.id);
    assert.strictEqual(url, "https://warp.sdisk.us/v2/@org/my.cool-ext-name");
  });
});
