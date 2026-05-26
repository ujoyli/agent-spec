import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { initCommand } from "../src/commands/init.js";
import { syncCommand } from "../src/commands/sync.js";
import { updateCommand } from "../src/commands/update.js";

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

  test("init offline imports configs locally without creating repository", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    await mkdir(join(home, ".claude", "skills", "review"), { recursive: true });
    await writeFile(join(home, ".claude", "CLAUDE.md"), "Offline prompt");
    await writeFile(join(home, ".claude", "skills", "review", "SKILL.md"), "Review skill");

    const calls: string[][] = [];
    const result = await initCommand({
      home,
      workspace,
      offline: true,
      run: async (command, args) => {
        calls.push([command, ...args]);
        return { code: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.mode).toBe("offline");
    expect(result.imported).toEqual(expect.arrayContaining(["CLAUDE.md", "skills/review/SKILL.md"]));
    await expect(readFile(join(workspace, "CLAUDE.md"), "utf8")).resolves.toContain("Offline prompt");
    await expect(readFile(join(workspace, ".agent-spec.json"), "utf8")).resolves.toContain(workspace);
    expect(calls).toEqual([]);
  });

  test("init pulls existing agent-spec repository instead of creating numbered fallback", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    await mkdir(join(home, ".codex"), { recursive: true });

    const calls: string[][] = [];
    const result = await initCommand({
      home,
      workspace,
      run: async (command, args) => {
        calls.push([command, ...args]);
        if (command === "gh" && args.join(" ") === "repo create agent-spec --private") {
          return { code: 1, stdout: "", stderr: "name already exists" };
        }
        if (command === "gh" && args.join(" ") === "repo view agent-spec --json name,url") {
          return {
            code: 0,
            stdout: "{\"name\":\"agent-spec\",\"url\":\"https://github.com/octo/agent-spec\"}\n",
            stderr: "",
          };
        }
        if (command === "git" && args.join(" ") === `clone https://github.com/octo/agent-spec ${workspace}`) {
          await writeFile(join(workspace, ".agent-spec.json"), "{\"repository\":{\"name\":\"agent-spec\"}}");
          return { code: 0, stdout: "", stderr: "" };
        }
        return { code: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.mode).toBe("pulled");
    expect(result.imported).toEqual([]);
    expect(calls.map((call) => call.join(" "))).toEqual(
      expect.arrayContaining([
        "gh repo create agent-spec --private",
        "gh repo view agent-spec --json name,url",
      ]),
    );
    expect(calls).toContainEqual(["git", "clone", "https://github.com/octo/agent-spec", workspace]);
    expect(calls.some((call) => call.join(" ") === "gh repo create agent-spec-01 --private")).toBe(false);
  });

  test("init falls back to numbered repository when existing agent-spec is not a config repository", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    await mkdir(join(home, ".claude"), { recursive: true });
    await writeFile(join(home, ".claude", "CLAUDE.md"), "Base prompt");

    const calls: string[][] = [];
    const result = await initCommand({
      home,
      workspace,
      run: async (command, args) => {
        calls.push([command, ...args]);
        if (command === "gh" && args.join(" ") === "repo create agent-spec --private") {
          return { code: 1, stdout: "", stderr: "name already exists" };
        }
        if (command === "gh" && args.join(" ") === "repo view agent-spec --json name,url") {
          return {
            code: 0,
            stdout: "{\"name\":\"agent-spec\",\"url\":\"https://github.com/octo/agent-spec\"}\n",
            stderr: "",
          };
        }
        if (command === "git" && args.join(" ") === `clone https://github.com/octo/agent-spec ${workspace}`) {
          await writeFile(join(workspace, "package.json"), "{\"name\":\"source-repo\"}");
          return { code: 0, stdout: "", stderr: "" };
        }
        if (command === "gh" && args.join(" ") === "repo create agent-spec-01 --private") {
          return { code: 0, stdout: "https://github.com/octo/agent-spec-01.git\n", stderr: "" };
        }
        return { code: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.mode).toBe("created");
    expect(result.createdRepository).toBe("agent-spec-01");
    expect(result.imported).toContain("CLAUDE.md");
    await expect(readFile(join(workspace, "package.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(join(workspace, "CLAUDE.md"), "utf8")).resolves.toContain("Base prompt");
    expect(calls).toContainEqual(["gh", "repo", "create", "agent-spec-01", "--private"]);
  });

  test("init merges Claude Code, Codex, and OpenCode config into the workspace", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    await mkdir(join(home, ".claude", "skills", "review"), { recursive: true });
    await mkdir(join(home, ".codex", "skills", "debug"), { recursive: true });
    await mkdir(join(home, ".config", "opencode", "skills", "ship"), { recursive: true });
    await writeFile(join(home, ".claude", "CLAUDE.md"), "Claude prompt");
    await writeFile(join(home, ".claude", "skills", "review", "SKILL.md"), "Review skill");
    await writeFile(join(home, ".codex", "AGENTS.md"), "Codex prompt");
    await writeFile(join(home, ".codex", "skills", "debug", "SKILL.md"), "Debug skill");
    await writeFile(join(home, ".config", "opencode", "AGENTS.md"), "OpenCode prompt");
    await writeFile(join(home, ".config", "opencode", "skills", "ship", "SKILL.md"), "Ship skill");

    const result = await initCommand({
      home,
      workspace,
      run: async (command) => {
        if (command === "gh") {
          return { code: 0, stdout: "https://github.com/octo/agent-spec.git\n", stderr: "" };
        }
        return { code: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.imported).toEqual(
      expect.arrayContaining([
        "CLAUDE.md",
        "skills/review/SKILL.md",
        "skills/debug/SKILL.md",
        "skills/ship/SKILL.md",
      ]),
    );
    const mergedPrompt = await readFile(join(workspace, "CLAUDE.md"), "utf8");
    expect(mergedPrompt).toContain("Claude prompt");
    expect(mergedPrompt).toContain("Codex prompt");
    expect(mergedPrompt).toContain("OpenCode prompt");
    await expect(readFile(join(workspace, "prompts", "codex", "AGENTS.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(join(workspace, "skills", "debug", "SKILL.md"), "utf8")).resolves.toBe("Debug skill");
  });

  test("update rescans configs, merges them, commits, and pushes", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    await mkdir(join(home, ".claude"), { recursive: true });
    await mkdir(join(home, ".codex"), { recursive: true });
    await writeFile(join(home, ".claude", "CLAUDE.md"), "Updated Claude prompt");
    await writeFile(join(home, ".codex", "AGENTS.md"), "Updated Codex prompt");

    const calls: string[][] = [];
    const result = await updateCommand({
      home,
      workspace,
      run: async (command, args) => {
        calls.push([command, ...args]);
        if (command === "git" && args.join(" ") === "status --porcelain") {
          return { code: 0, stdout: "M CLAUDE.md\n", stderr: "" };
        }
        return { code: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.imported).toContain("CLAUDE.md");
    expect(result.imported).not.toContain("prompts/codex/AGENTS.md");
    const mergedPrompt = await readFile(join(workspace, "CLAUDE.md"), "utf8");
    expect(mergedPrompt).toContain("Updated Claude prompt");
    expect(mergedPrompt).toContain("Updated Codex prompt");
    expect(calls.map((call) => call.join(" "))).toEqual(
      expect.arrayContaining([
        "git pull --ff-only",
        "git add .",
        "git commit -m chore: update agent spec config",
        "git push",
      ]),
    );
  });

  test("update merges skills, mcp, and plugins from all tools into Claude-style workspace folders", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    await mkdir(join(home, ".claude", "skills", "review"), { recursive: true });
    await mkdir(join(home, ".codex", "mcp"), { recursive: true });
    await mkdir(join(home, ".config", "opencode", "plugins", "ship"), { recursive: true });
    await writeFile(join(home, ".claude", "CLAUDE.md"), "Claude prompt");
    await writeFile(join(home, ".claude", "skills", "review", "SKILL.md"), "Review skill");
    await writeFile(join(home, ".codex", "AGENTS.md"), "Codex prompt");
    await writeFile(join(home, ".codex", "mcp", "github.json"), "{\"server\":\"github\"}");
    await writeFile(join(home, ".config", "opencode", "AGENTS.md"), "OpenCode prompt");
    await writeFile(join(home, ".config", "opencode", "plugins", "ship", "plugin.json"), "{\"name\":\"ship\"}");

    const result = await updateCommand({
      home,
      workspace,
      run: async (command, args) => {
        if (command === "git" && args.join(" ") === "status --porcelain") {
          return { code: 0, stdout: "M CLAUDE.md\n", stderr: "" };
        }
        return { code: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.imported).toEqual(
      expect.arrayContaining([
        "CLAUDE.md",
        "skills/review/SKILL.md",
        "mcp/github.json",
        "plugins/ship/plugin.json",
      ]),
    );
    await expect(readFile(join(workspace, "skills", "review", "SKILL.md"), "utf8")).resolves.toBe("Review skill");
    await expect(readFile(join(workspace, "mcp", "github.json"), "utf8")).resolves.toBe("{\"server\":\"github\"}");
    await expect(readFile(join(workspace, "plugins", "ship", "plugin.json"), "utf8")).resolves.toBe("{\"name\":\"ship\"}");
  });

  test("update skips commit and push when no files changed", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    await mkdir(join(home, ".claude"), { recursive: true });
    await writeFile(join(home, ".claude", "CLAUDE.md"), "Same prompt");

    const calls: string[][] = [];
    const result = await updateCommand({
      home,
      workspace,
      run: async (command, args) => {
        calls.push([command, ...args]);
        if (command === "git" && args.join(" ") === "status --porcelain") {
          return { code: 0, stdout: "", stderr: "" };
        }
        return { code: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.changed).toBe(false);
    expect(calls.map((call) => call.join(" "))).not.toContain("git commit -m chore: update agent spec config");
    expect(calls.map((call) => call.join(" "))).not.toContain("git push");
  });

  test("sync applies canonical config to discovered Claude Code, Codex, and OpenCode targets", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    await mkdir(join(home, ".claude"), { recursive: true });
    await mkdir(join(home, ".codex"), { recursive: true });
    await mkdir(join(home, ".config", "opencode"), { recursive: true });
    await writeFile(join(workspace, "CLAUDE.md"), "Base prompt");

    const result = await syncCommand({
      home,
      workspace,
      run: async () => ({ code: 0, stdout: "", stderr: "" }),
    });

    expect(result.syncedTargets).toEqual(["claude-code", "codex", "opencode"]);
    await expect(readFile(join(home, ".claude", "CLAUDE.md"), "utf8")).resolves.toBe("Base prompt");
    await expect(readFile(join(home, ".codex", "AGENTS.md"), "utf8")).resolves.toBe("Base prompt");
    await expect(readFile(join(home, ".config", "opencode", "AGENTS.md"), "utf8")).resolves.toBe("Base prompt");
  });

  test("sync writes converted targets to output directory when provided", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    const outputDir = await mkdtemp(join(tmpdir(), "agentspec-cmd-output-"));
    await mkdir(join(home, ".codex"), { recursive: true });
    await mkdir(join(home, ".config", "opencode"), { recursive: true });
    await writeFile(join(workspace, "CLAUDE.md"), "Base prompt");

    const result = await syncCommand({
      home,
      workspace,
      outputDir,
      run: async () => ({ code: 0, stdout: "", stderr: "" }),
    });

    expect(result.syncedTargets).toEqual(["codex", "opencode"]);
    await expect(readFile(join(outputDir, "codex", "AGENTS.md"), "utf8")).resolves.toBe("Base prompt");
    await expect(readFile(join(outputDir, "opencode", "AGENTS.md"), "utf8")).resolves.toBe("Base prompt");
    await expect(readFile(join(home, ".codex", "AGENTS.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("sync writes merged canonical skills, mcp, and plugins to target tools", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-cmd-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-cmd-workspace-"));
    const outputDir = await mkdtemp(join(tmpdir(), "agentspec-cmd-output-"));
    await mkdir(join(home, ".codex"), { recursive: true });
    await mkdir(join(home, ".config", "opencode"), { recursive: true });
    await mkdir(join(workspace, "skills", "review"), { recursive: true });
    await mkdir(join(workspace, "mcp"), { recursive: true });
    await mkdir(join(workspace, "plugins", "ship"), { recursive: true });
    await writeFile(join(workspace, "CLAUDE.md"), "Merged prompt");
    await writeFile(join(workspace, "skills", "review", "SKILL.md"), "Review skill");
    await writeFile(join(workspace, "mcp", "github.json"), "{\"server\":\"github\"}");
    await writeFile(join(workspace, "plugins", "ship", "plugin.json"), "{\"name\":\"ship\"}");

    const result = await syncCommand({
      home,
      workspace,
      outputDir,
      run: async () => ({ code: 0, stdout: "", stderr: "" }),
    });

    expect(result.syncedTargets).toEqual(["codex", "opencode"]);
    await expect(readFile(join(outputDir, "codex", "AGENTS.md"), "utf8")).resolves.toBe("Merged prompt");
    await expect(readFile(join(outputDir, "codex", "skills", "review", "SKILL.md"), "utf8")).resolves.toBe("Review skill");
    await expect(readFile(join(outputDir, "codex", "mcp", "github.json"), "utf8")).resolves.toBe("{\"server\":\"github\"}");
    await expect(readFile(join(outputDir, "codex", "plugins", "ship", "plugin.json"), "utf8")).resolves.toBe("{\"name\":\"ship\"}");
    await expect(readFile(join(outputDir, "opencode", "mcp", "github.json"), "utf8")).resolves.toBe("{\"server\":\"github\"}");
    await expect(readFile(join(outputDir, "opencode", "plugins", "ship", "plugin.json"), "utf8")).resolves.toBe("{\"name\":\"ship\"}");
  });
});
