import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("package scripts", () => {
  test("defines a local binary build command", async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["build:binary"]).toBe(
      "bun build ./src/cli.ts --compile --outfile ./dist-bin/agentspec",
    );
  });
});
