import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { discoverTools } from "../src/core/discovery.js";

describe("discoverTools", () => {
  test("detects Claude Code, Codex, and OpenCode config directories", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-discovery-"));
    await mkdir(join(home, ".claude", "skills"), { recursive: true });
    await mkdir(join(home, ".codex", "skills"), { recursive: true });
    await mkdir(join(home, ".config", "opencode"), { recursive: true });
    await writeFile(join(home, ".claude", "CLAUDE.md"), "Claude prompt");

    const tools = await discoverTools(home);

    expect(tools.map((tool) => tool.name)).toEqual(["claude-code", "codex", "opencode"]);
    expect(tools[0]?.configDir).toBe(join(home, ".claude"));
    expect(tools[1]?.configDir).toBe(join(home, ".codex"));
    expect(tools[2]?.configDir).toBe(join(home, ".config", "opencode"));
  });
});
