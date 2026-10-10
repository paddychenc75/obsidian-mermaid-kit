// Bundles each test with esbuild, then hands the result to Node's own test runner.
// The Obsidian API only exists inside the app, so tests see a stub in its place.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import esbuild from "esbuild";

const root = resolve(import.meta.dirname, "..");
const out = mkdtempSync(join(tmpdir(), "mermaid-kit-test-"));
const entries = readdirSync(join(root, "tests"))
  .filter((name) => name.endsWith(".test.ts"))
  .map((name) => join(root, "tests", name));

let status = 1;
try {
  await esbuild.build({
    entryPoints: entries,
    outdir: out,
    bundle: true,
    format: "esm",
    platform: "node",
    outExtension: { ".js": ".mjs" },
    alias: { obsidian: join(root, "tests", "obsidian-stub.ts") },
    logLevel: "error",
  });
  const files = readdirSync(out).map((name) => join(out, name));
  status = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" }).status ?? 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
process.exit(status);
