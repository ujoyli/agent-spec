import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { applyCanonicalToTarget, importClaudeBase } from "../src/core/copy.js";

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
});
