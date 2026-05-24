import { join } from "node:path";

export type ToolName = "claude-code" | "codex" | "opencode";

export interface ToolPath {
  name: ToolName;
  configDir: string;
}

export interface TargetMapping {
  promptFile: string;
  skillsDir: string;
}

export function candidateToolPaths(home: string): ToolPath[] {
  return [
    { name: "claude-code", configDir: join(home, ".claude") },
    { name: "codex", configDir: join(home, ".codex") },
    { name: "opencode", configDir: join(home, ".config", "opencode") },
  ];
}

export function targetMapping(tool: ToolName): TargetMapping {
  if (tool === "claude-code") {
    return { promptFile: "CLAUDE.md", skillsDir: "skills" };
  }

  return { promptFile: "AGENTS.md", skillsDir: "skills" };
}

