import { constants } from "node:fs";
import { access, cp, mkdir, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { TargetMapping } from "./paths.js";

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

