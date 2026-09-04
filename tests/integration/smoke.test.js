import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { run } from "../../src/index.js";
import { parsePublishOutput, buildPackageUrl } from "../../src/parser.js";

function createMockCore(inputs = {}) {
  const outputs = {};
  const secrets = [];
  const infoLogs = [];
  const warnings = [];
  let failedMessage = null;

  return {
    inputs,
    outputs,
    secrets,
    infoLogs,
    warnings,
    get failed() {
      return failedMessage;
    },
    getInput: (name) => inputs[name] || "",
    setSecret: (val) => secrets.push(val),
    setOutput: (name, val) => {
      outputs[name] = val;
    },
    setFailed: (msg) => {
      failedMessage = msg;
    },
    info: (msg) => infoLogs.push(msg),
    warning: (msg) => warnings.push(msg),
    summary: (() => {
      let captured = null;
      return {
        get lastRaw() {
          return captured;
        },
        addHeading: function () {
          return this;
        },
        addRaw: function (val) {
          captured = val;
          return this;
        },
        addLink: function () {
          return this;
        },
        write: function () {
          return Promise.resolve();
        },
      };
    })(),
  };
}

function createMockExec(stdout = "", stderr = "", exitCode = 0) {
  let capturedArgs = null;
  return {
    get capturedArgs() {
      return capturedArgs;
    },
    exec: async (cmd, args, _opts) => {
      capturedArgs = { cmd, args, opts: _opts };
      const listener = _opts?.listeners;
      if (listener?.stdout && stdout) listener.stdout(Buffer.from(stdout));
      if (listener?.stderr && stderr) listener.stderr(Buffer.from(stderr));
      return exitCode;
    },
  };
}

describe("run() integration", () => {
  it("sets outputs on successful publish", async () => {
    const core = createMockCore({
      token: "test-token",
      "registry-url": "https://warp.sdisk.us",
      "working-directory": ".",
      "compiler-version": "0.3.0",
      "dry-run": "false",
    });
    const exec = createMockExec("✓ Published @my-org/my-ext@1.2.3", "", 0);

    await run({ core, exec });

    assert.strictEqual(core.outputs.owner, "@my-org");
    assert.strictEqual(core.outputs.id, "my-ext");
    assert.strictEqual(core.outputs.version, "1.2.3");
    assert.strictEqual(core.outputs.status, "published");
    assert.strictEqual(core.outputs.url, "https://warp.sdisk.us/v2/@my-org/my-ext");
    assert.strictEqual(core.failed, null);
  });

  it("sets pending status for first publish", async () => {
    const core = createMockCore({
      token: "test-token",
      "registry-url": "https://warp.sdisk.us",
      "compiler-version": "0.3.0",
      "dry-run": "false",
    });
    const exec = createMockExec(
      "✓ Published @alice/ext@0.1.0 (pending review — this is your first publish)",
      "",
      0,
    );

    await run({ core, exec });

    assert.strictEqual(core.outputs.status, "pending");
    assert.strictEqual(core.outputs.owner, "@alice");
    assert.strictEqual(core.outputs.id, "ext");
  });

  it("runs build command in dry-run mode without token", async () => {
    const core = createMockCore({
      "registry-url": "https://warp.sdisk.us",
      "compiler-version": "0.3.0",
      "dry-run": "true",
    });
    const exec = createMockExec("✓ Built dist/ext@1.0.0.js", "", 0);

    await run({ core, exec });

    assert.strictEqual(core.failed, null);
    assert.strictEqual(Object.keys(core.outputs).length, 0);
    assert.ok(exec.capturedArgs.args.includes("build"));
    assert.ok(!exec.capturedArgs.args.includes("publish"));
    assert.ok(!exec.capturedArgs.opts.env.WARP_TOKEN);
  });

  it("passes WARP_TOKEN in env for publish", async () => {
    const core = createMockCore({
      token: "secret-token-123",
      "registry-url": "https://warp.sdisk.us",
      "compiler-version": "0.3.0",
      "dry-run": "false",
    });
    const exec = createMockExec("✓ Published @t/t@1.0.0", "", 0);

    await run({ core, exec });

    assert.strictEqual(exec.capturedArgs.opts.env.WARP_TOKEN, "secret-token-123");
    assert.deepStrictEqual(core.secrets, ["secret-token-123"]);
  });

  it("uses --ignore-scripts in npx invocation", async () => {
    const core = createMockCore({
      token: "tok",
      "compiler-version": "0.3.0",
      "dry-run": "true",
    });
    const exec = createMockExec("✓ Built dist/x@1.0.0.js", "", 0);

    await run({ core, exec });

    assert.ok(exec.capturedArgs.args.includes("--ignore-scripts"));
  });

  it("calls core.setFailed on compiler failure with stderr message", async () => {
    const core = createMockCore({
      token: "test-token",
      "compiler-version": "0.3.0",
      "dry-run": "false",
    });
    const exec = createMockExec("", "✗ Version already exists for this owner.\n", 1);

    await run({ core, exec });

    assert.ok(core.failed);
    assert.ok(core.failed.includes("Version already exists"));
  });

  it("uses generic error message when stderr is empty", async () => {
    const core = createMockCore({
      token: "test-token",
      "compiler-version": "0.3.0",
      "dry-run": "false",
    });
    const exec = createMockExec("", "", 1);

    await run({ core, exec });

    assert.ok(core.failed);
    assert.ok(core.failed.includes("exit code 1"));
  });

  it("warns on unmatched output shape", async () => {
    const core = createMockCore({
      token: "test-token",
      "compiler-version": "0.3.0",
      "dry-run": "false",
    });
    const exec = createMockExec("Done! Your extension has been uploaded.", "", 0);

    await run({ core, exec });

    assert.strictEqual(core.failed, null);
    assert.strictEqual(Object.keys(core.outputs).length, 0);
    assert.ok(core.warnings.length > 0);
    assert.ok(core.warnings[0].includes("did not match any known format"));
  });

  it("fails when token is missing and dry-run is false", async () => {
    const core = createMockCore({
      "compiler-version": "0.3.0",
      "dry-run": "false",
    });
    const exec = createMockExec();

    await run({ core, exec });

    assert.ok(core.failed);
    assert.ok(core.failed.includes("token input is required"));
  });
});

describe("parser + URL builder integration", () => {
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
