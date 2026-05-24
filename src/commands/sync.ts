import { discoverTools } from "../core/discovery.js";
import { applyCanonicalToTarget } from "../core/copy.js";
import { defaultRunner, git, type CommandRunner } from "../core/github.js";
import { targetMapping, type ToolName } from "../core/paths.js";

export interface SyncOptions {
  home: string;
  workspace: string;
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
    if (tool.name === "claude-code") {
      continue;
    }

    await applyCanonicalToTarget(options.workspace, tool.configDir, targetMapping(tool.name));
    syncedTargets.push(tool.name);
  }

  return { syncedTargets };
}

