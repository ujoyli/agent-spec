import { discoverTools } from "../core/discovery.js";
import { applyCanonicalToTarget } from "../core/copy.js";
import { defaultRunner, git, type CommandRunner } from "../core/github.js";
import { targetMapping, type ToolName } from "../core/paths.js";
import { join } from "node:path";

export interface SyncOptions {
  home: string;
  workspace: string;
  outputDir?: string;
  run?: CommandRunner;
}

export interface SyncResult {
  syncedTargets: ToolName[];
}

export async function syncCommand(options: SyncOptions): Promise<SyncResult> {
  const run = options.run ?? defaultRunner;
  await git(run, options.workspace, ["pull", "--ff-only"]);

  const tools = await discoverTools(options.home);
  const syncedTargets: ToolName[] = [];

  for (const tool of tools) {
    const targetDir = options.outputDir ? join(options.outputDir, tool.name) : tool.configDir;
    await applyCanonicalToTarget(options.workspace, targetDir, targetMapping(tool.name));
    syncedTargets.push(tool.name);
  }

  return { syncedTargets };
}
