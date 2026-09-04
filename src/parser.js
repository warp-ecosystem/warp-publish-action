import { stripAnsi } from "./ansi.js";

const SUCCESS_RE = /✓ Published (@[^\s/]+)\/([^\s@]+)@([^\s]+)(?:\s*\(pending review[^)]*\))?/;

/**
 * Parse the CLI output from `warp-compiler publish` to extract structured
 * publish results.
 *
 * @param {string} stdout - Raw stdout from the CLI process
 * @returns {{ owner: string, id: string, version: string, status: string } | null}
 */
export function parsePublishOutput(stdout) {
  const lines = stdout.split("\n").filter((line) => line.trim().length > 0);

  for (const line of lines) {
    const cleaned = stripAnsi(line);
    const match = cleaned.match(SUCCESS_RE);
    if (match) {
      const owner = match[1];
      const id = match[2];
      const version = match[3];
      const pending = cleaned.includes("(pending review");
      return {
        owner,
        id,
        version,
        status: pending ? "pending" : "published",
      };
    }
  }

  return null;
}

/**
 * Build the public URL for a package on the registry.
 *
 * NOTE: This is coupled to warp-registry's URL scheme — the route
 * `/v2/@${owner}/${id}` is derived from the POST /v2/publish handler
 * in warp-registry's routes.js. If warp-registry's routing ever changes,
 * this construction needs to be updated to match.
 *
 * @param {string} registryUrl - Base URL of the registry (e.g. "https://warp.sdisk.us")
 * @param {string} owner - The package owner (e.g. "@example")
 * @param {string} id - The package id
 * @returns {string} The full URL to the package on the registry
 */
export function buildPackageUrl(registryUrl, owner, id) {
  const base = registryUrl.replace(/\/+$/, "");
  const ownerPrefix = owner.startsWith("@") ? owner : `@${owner}`;
  return `${base}/v2/${ownerPrefix}/${id}`;
}
