import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { applyCanonicalToTarget, importClaudeBase, importToolConfigs } from "../src/core/copy.js";

describe("copy", () => {
  test("imports Claude-style files into a repository workspace", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-copy-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-copy-workspace-"));
    const claudeDir = join(home, ".claude");
    await mkdir(join(claudeDir, "skills", "review"), { recursive: true });
    await writeFile(join(claudeDir, "CLAUDE.md"), "Base prompt");
    await writeFile(join(claudeDir, "skills", "review", "SKILL.md"), "Review skill");

    const copied = await importClaudeBase(claudeDir, workspace);

    expect(copied).toEqual(["CLAUDE.md", "skills/review/SKILL.md"]);
    await expect(readFile(join(workspace, "CLAUDE.md"), "utf8")).resolves.toBe("Base prompt");
    await expect(readFile(join(workspace, "skills", "review", "SKILL.md"), "utf8")).resolves.toBe("Review skill");
  });

  test("applies canonical files to a target directory", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-copy-workspace-"));
    const target = await mkdtemp(join(tmpdir(), "agentspec-copy-target-"));
    await mkdir(join(workspace, "skills", "debug"), { recursive: true });
    await writeFile(join(workspace, "CLAUDE.md"), "Base prompt");
    await writeFile(join(workspace, "skills", "debug", "SKILL.md"), "Debug skill");

    const copied = await applyCanonicalToTarget(workspace, target, {
      promptFile: "AGENTS.md",
      skillsDir: "skills",
    });

    expect(copied).toEqual(["AGENTS.md", "skills/debug/SKILL.md"]);
    await expect(readFile(join(target, "AGENTS.md"), "utf8")).resolves.toBe("Base prompt");
    await expect(readFile(join(target, "skills", "debug", "SKILL.md"), "utf8")).resolves.toBe("Debug skill");
  });

  test("imports non-Claude tool configs without requiring Claude", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-copy-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-copy-workspace-"));
    await mkdir(join(home, ".codex", "skills", "debug"), { recursive: true });
    await writeFile(join(home, ".codex", "AGENTS.md"), "Codex prompt");
    await writeFile(join(home, ".codex", "skills", "debug", "SKILL.md"), "Debug skill");

    const copied = await importToolConfigs(
      [{ name: "codex", configDir: join(home, ".codex") }],
      workspace,
    );

    expect(copied).toEqual(["CLAUDE.md", "prompts/codex/AGENTS.md", "skills/debug/SKILL.md"]);
    await expect(readFile(join(workspace, "prompts", "codex", "AGENTS.md"), "utf8")).resolves.toBe("Codex prompt");
    await expect(readFile(join(workspace, "CLAUDE.md"), "utf8")).resolves.toContain("Codex prompt");
  });

  test("merges prompt text from multiple tools into CLAUDE.md", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-copy-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-copy-workspace-"));
    await mkdir(join(home, ".claude"), { recursive: true });
    await mkdir(join(home, ".codex"), { recursive: true });
    await writeFile(join(home, ".claude", "CLAUDE.md"), "Claude prompt");
    await writeFile(join(home, ".codex", "AGENTS.md"), "Codex prompt");

    await importToolConfigs(
      [
        { name: "claude-code", configDir: join(home, ".claude") },
        { name: "codex", configDir: join(home, ".codex") },
      ],
      workspace,
    );

    const mergedPrompt = await readFile(join(workspace, "CLAUDE.md"), "utf8");
    expect(mergedPrompt).toContain("Claude prompt");
    expect(mergedPrompt).toContain("Codex prompt");
    expect(mergedPrompt).toContain("## From Claude Code");
    expect(mergedPrompt).toContain("## From Codex");
  });

  test("skips cache directories and large runtime files when importing configs", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-copy-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-copy-workspace-"));
    await mkdir(join(home, ".codex", "plugins", "cache", "runtime"), { recursive: true });
    await mkdir(join(home, ".codex", "plugins", "custom-plugin"), { recursive: true });
    await writeFile(join(home, ".codex", "AGENTS.md"), "Codex prompt");
    await writeFile(join(home, ".codex", "plugins", "cache", "runtime", "node"), "runtime");
    await writeFile(join(home, ".codex", "plugins", "custom-plugin", "plugin.json"), "{\"name\":\"custom\"}");
    await writeFile(join(home, ".codex", "plugins", "custom-plugin", "big.bin"), Buffer.alloc(6 * 1024 * 1024));

    const copied = await importToolConfigs(
      [{ name: "codex", configDir: join(home, ".codex") }],
      workspace,
    );

    expect(copied).toContain("plugins/custom-plugin/plugin.json");
    expect(copied).not.toContain("plugins/cache/runtime/node");
    expect(copied).not.toContain("plugins/custom-plugin/big.bin");
    await expect(readFile(join(workspace, "plugins", "custom-plugin", "plugin.json"), "utf8")).resolves.toBe("{\"name\":\"custom\"}");
    await expect(readFile(join(workspace, "plugins", "cache", "runtime", "node"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(join(workspace, "plugins", "custom-plugin", "big.bin"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("skips dangling symlinks when importing configs", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-copy-home-"));
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-copy-workspace-"));
    await mkdir(join(home, ".claude", "skills"), { recursive: true });
    await writeFile(join(home, ".claude", "CLAUDE.md"), "Claude prompt");
    await symlink(join(home, "missing-skill"), join(home, ".claude", "skills", "missing"));

    const copied = await importToolConfigs(
      [{ name: "claude-code", configDir: join(home, ".claude") }],
      workspace,
    );

    expect(copied).toContain("CLAUDE.md");
    expect(copied).not.toContain("skills/missing");
    await expect(readFile(join(workspace, "skills", "missing"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
