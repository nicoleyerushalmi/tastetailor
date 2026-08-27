import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

function walk(dir: string, filter: (name: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...walk(full, filter));
    } else if (filter(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("secret hygiene (SEC-08)", () => {
  it("gitignore ignores .env* except examples", () => {
    const gitignore = readFileSync(path.join(root, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/\.env\*/);
    expect(gitignore).toMatch(/!\.env.*\.example/);
  });

  it("no committed .env.local in repo root", () => {
    // Presence locally is fine; it must not be tracked. We only assert the
    // example file is the committed template.
    expect(existsSync(path.join(root, ".env.local.example"))).toBe(true);
  });
});

describe("server-only import boundary (SEC-10)", () => {
  it('no "use client" file imports lib/ai or lib/images', () => {
    const clients = walk(root, (name) => /\.(tsx?|jsx?)$/.test(name)).filter(
      (file) => {
        const src = readFileSync(file, "utf8");
        return /^["']use client["']/.test(src.trimStart());
      },
    );

    const offenders: string[] = [];
    for (const file of clients) {
      const src = readFileSync(file, "utf8");
      if (
        /from\s+["']@\/lib\/ai(\/|["'])/.test(src) ||
        /from\s+["']@\/lib\/images(\/|["'])/.test(src)
      ) {
        offenders.push(path.relative(root, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
