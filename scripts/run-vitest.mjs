import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const tempDirectory = resolve(".test-tmp");
mkdirSync(tempDirectory, { recursive: true });
const vitestEntry = resolve("node_modules/vitest/vitest.mjs");
const result = spawnSync(process.execPath, [vitestEntry, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, TEMP: tempDirectory, TMP: tempDirectory, TMPDIR: tempDirectory }
});
process.exit(result.status ?? 1);
