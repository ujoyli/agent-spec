import { constants } from "node:fs";
import { access, cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { TargetMapping, ToolPath } from "./paths.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function toPortablePath(path: string): string {
  return path.split(sep).join("/");
}

async function listFiles(root: string, base = root): Promise<string[]> {
  if (!(await exists(root))) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath, base)));
    } else if (entry.isFile()) {
      files.push(toPortablePath(relative(base, fullPath)));
    }
  }

  return files.sort();
}

export async function importClaudeBase(claudeDir: string, workspace: string): Promise<string[]> {
  const copied: string[] = [];
  await mkdir(workspace, { recursive: true });

  const promptSource = join(claudeDir, "CLAUDE.md");
  if (await exists(promptSource)) {
    await cp(promptSource, join(workspace, "CLAUDE.md"));
    copied.push("CLAUDE.md");
  }

  const directories = ["skills", "mcp", "plugins"];
  for (const directory of directories) {
    const source = join(claudeDir, directory);
    if (await exists(source)) {
      await cp(source, join(workspace, directory), { recursive: true });
      const files = await listFiles(join(workspace, directory), workspace);
      copied.push(...files);
    }
  }

  return [...new Set(copied)].sort();
}

function promptNameForTool(tool: ToolPath): string {
  return tool.name === "claude-code" ? "CLAUDE.md" : "AGENTS.md";
}

function promptTitleForTool(tool: ToolPath): string {
  if (tool.name === "claude-code") {
    return "Claude Code";
  }
  if (tool.name === "codex") {
    return "Codex";
  }
  return "OpenCode";
}

function mergedPrompt(sections: Array<{ title: string; text: string }>): string {
  return sections
    .filter((section) => section.text.trim().length > 0)
    .map((section) => `## From ${section.title}\n\n${section.text.trim()}`)
    .join("\n\n");
}

async function copyDirectoryContents(source: string, target: string, workspace: string): Promise<string[]> {
  if (!(await exists(source))) {
    return [];
  }

  await cp(source, target, { recursive: true });
  return listFiles(target, workspace);
}

export async function importToolConfigs(tools: ToolPath[], workspace: string): Promise<string[]> {
  const copied: string[] = [];
  const promptSections: Array<{ title: string; text: string }> = [];
  await mkdir(workspace, { recursive: true });

  for (const tool of tools) {
    const promptSource = join(tool.configDir, promptNameForTool(tool));
    if (await exists(promptSource)) {
      const promptText = await readFile(promptSource, "utf8");
      promptSections.push({ title: promptTitleForTool(tool), text: promptText });

      if (tool.name === "claude-code") {
        copied.push("CLAUDE.md");
      } else {
        const promptTarget = join(workspace, "prompts", tool.name, "AGENTS.md");
        await mkdir(join(workspace, "prompts", tool.name), { recursive: true });
        await cp(promptSource, promptTarget);
        copied.push(toPortablePath(relative(workspace, promptTarget)));
      }
    }

    for (const directory of ["skills", "mcp", "plugins"]) {
      copied.push(
        ...(await copyDirectoryContents(
          join(tool.configDir, directory),
          join(workspace, directory),
          workspace,
        )),
      );
    }
  }

  const prompt = mergedPrompt(promptSections);
  if (prompt.length > 0) {
    await writeFile(join(workspace, "CLAUDE.md"), `${prompt}\n`);
    copied.push("CLAUDE.md");
  }

  return [...new Set(copied)].sort();
}

export async function applyCanonicalToTarget(
  workspace: string,
  targetDir: string,
  mapping: TargetMapping,
): Promise<string[]> {
  const copied: string[] = [];
  await mkdir(targetDir, { recursive: true });

  const promptSource = join(workspace, "CLAUDE.md");
  if (await exists(promptSource)) {
    await cp(promptSource, join(targetDir, mapping.promptFile));
    copied.push(mapping.promptFile);
  }

  const skillsSource = join(workspace, "skills");
  if (await exists(skillsSource)) {
    await cp(skillsSource, join(targetDir, mapping.skillsDir), { recursive: true });
    const files = await listFiles(join(targetDir, mapping.skillsDir), targetDir);
    copied.push(...files);
  }

  return [...new Set(copied)].sort();
}
