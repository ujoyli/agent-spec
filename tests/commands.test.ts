import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { initCommand } from "../src/commands/init.js";
import { syncCommand } from "../src/commands/sync.js";

describe("commands", () => {
  test("init imports Claude base, creates repository, and writes state", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    await mkdir(join(home, ".claude", "skills", "review"), { recursive: true });
    await writeFile(join(home, ".claude", "CLAUDE.md"), "Base prompt");
    await writeFile(join(home, ".claude", "skills", "review", "SKILL.md"), "Review skill");

    const calls: string[][] = [];
    const result = await initCommand({
      home,
      workspace,
      run: async (command, args) => {
        calls.push([command, ...args]);
        if (command === "gh") {
          return { code: 0, stdout: "https://github.com/octo/agent-spec.git\n", stderr: "" };
        }
        return { code: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.createdRepository).toBe("agent-spec");
    expect(result.imported).toContain("CLAUDE.md");
    await expect(readFile(join(workspace, ".agent-spec.json"), "utf8")).resolves.toContain("agent-spec");
    expect(calls.some((call) => call.join(" ") === "git add .")).toBe(true);
  });

  test("sync applies canonical config to discovered Codex and OpenCode targets", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    await mkdir(join(home, ".codex"), { recursive: true });
    await mkdir(join(home, ".config", "opencode"), { recursive: true });
    await writeFile(join(workspace, "CLAUDE.md"), "Base prompt");

    const result = await syncCommand({
      home,
      workspace,
      run: async () => ({ code: 0, stdout: "", stderr: "" }),
    });

    expect(result.syncedTargets).toEqual(["codex", "opencode"]);
    await expect(readFile(join(home, ".codex", "AGENTS.md"), "utf8")).resolves.toBe("Base prompt");
    await expect(readFile(join(home, ".config", "opencode", "AGENTS.md"), "utf8")).resolves.toBe("Base prompt");
  });
});
