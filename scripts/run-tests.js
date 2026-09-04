import { run } from "node:test";
import { spec as defaultSpec } from "node:test/reporters";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function findTestFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findTestFiles(full));
    } else if (full.endsWith(".test.js")) {
      files.push(full);
    }
  }
  return files;
}

const testFiles = [...findTestFiles("tests/unit"), ...findTestFiles("tests/integration")];

const stream = run({ files: testFiles });
stream.on("test:fail", () => {
  process.exitCode = 1;
});
stream.compose(new defaultSpec()).pipe(process.stdout);
