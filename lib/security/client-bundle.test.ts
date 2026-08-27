import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const staticDir = path.join(root, ".next", "static");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env) || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

loadEnvLocal();

const secrets = [
  process.env.GEMINI_API_KEY,
  process.env.UNSPLASH_ACCESS_KEY,
].filter((value): value is string => Boolean(value && value.length >= 8));

const hasClientBuild = existsSync(staticDir);

describe("client bundle secrets (SEC-06)", () => {
  it.skipIf(!hasClientBuild)(
    "GEMINI_API_KEY and UNSPLASH_ACCESS_KEY are absent from .next/static",
    () => {
      if (secrets.length === 0) {
        // Keys unset locally — nothing concrete to scan for.
        return;
      }

      const files = walkFiles(staticDir);
      expect(files.length).toBeGreaterThan(0);

      const leaks: string[] = [];
      for (const file of files) {
        let text: string;
        try {
          text = readFileSync(file, "utf8");
        } catch {
          continue;
        }
        for (const secret of secrets) {
          if (text.includes(secret)) {
            leaks.push(path.relative(root, file));
            break;
          }
        }
      }

      expect(leaks).toEqual([]);
    },
  );
});
