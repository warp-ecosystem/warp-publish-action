import * as core from "@actions/core";
import * as exec from "@actions/exec";
import { parsePublishOutput, buildPackageUrl } from "./parser.js";

const DEFAULT_REGISTRY_URL = "https://warp.sdisk.us";

async function run() {
  const token = core.getInput("token");
  const registryUrl = core.getInput("registry-url") || DEFAULT_REGISTRY_URL;
  const workingDirectory = core.getInput("working-directory") || ".";
  const compilerVersion = core.getInput("compiler-version") || "latest";
  const dryRun = core.getInput("dry-run") === "true";

  // Mask the token early so it's redacted even if the CLI echoes it
  if (token) {
    core.setSecret(token);
  }

  if (!dryRun && !token) {
    core.setFailed("token input is required when dry-run is not true");
    return;
  }

  const command = dryRun ? "build" : "publish";

  core.info(`Running warp-compiler ${command} in ${workingDirectory}`);
  core.info(`Registry: ${registryUrl}`);
  core.info(`Compiler version: ${compilerVersion}`);

  let stdout = "";
  let stderr = "";

  const env = {
    ...process.env,
    NO_COLOR: "1",
  };
  if (!dryRun && token) {
    env.WARP_TOKEN = token;
  }

  const exitCode = await exec.exec(
    "npx",
    [
      "--yes",
      `@warp-ecosystem/warp-compiler@${compilerVersion}`,
      command,
      "--registry",
      registryUrl,
    ],
    {
      cwd: workingDirectory,
      env,
      ignoreReturnCode: true,
      listeners: {
        stdout: (data) => {
          stdout += data.toString();
        },
        stderr: (data) => {
          stderr += data.toString();
        },
      },
    },
  );

  if (exitCode !== 0) {
    const lastError = stderr
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .pop();
    core.setFailed(lastError || `warp-compiler ${command} failed with exit code ${exitCode}`);
    return;
  }

  if (dryRun) {
    core.info("Build completed successfully (dry-run mode)");
    return;
  }

  const result = parsePublishOutput(stdout);

  if (result) {
    const { owner, id, version, status } = result;
    core.setOutput("owner", owner);
    core.setOutput("id", id);
    core.setOutput("version", version);
    core.setOutput("status", status);

    const url = buildPackageUrl(registryUrl, owner, id);
    core.setOutput("url", url);

    const statusLabel = status === "pending" ? "pending review" : status;
    core.summary
      .addHeading("Published", 2)
      .addRaw(`Published ${owner}/${id}@${version} (${statusLabel})`)
      .addLink("View on Registry", url)
      .write();

    core.info(`Published ${owner}/${id}@${version} (${statusLabel})`);
    core.info(`Registry URL: ${url}`);
  } else {
    core.warning(
      "Publish succeeded but output did not match any known format. " +
        "Structured outputs are empty. This may indicate a newer compiler version " +
        "changed its log output.",
    );
  }
}

run().catch((err) => {
  core.setFailed(err.message);
});
