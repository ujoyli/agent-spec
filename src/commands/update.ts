import { discoverTools } from "../core/discovery.js";
import { importToolConfigs } from "../core/copy.js";
import { defaultRunner, git, type CommandRunner } from "../core/github.js";

export interface UpdateOptions {
  home: string;
  workspace: string;
  run?: CommandRunner;
}

export interface UpdateResult {
  imported: string[];
  changed: boolean;
}

export async function updateCommand(options: UpdateOptions): Promise<UpdateResult> {
  const run = options.run ?? defaultRunner;
  const tools = await discoverTools(options.home);

  if (tools.length === 0) {
    throw new Error("No supported agent configuration was found. Create Claude Code, Codex, or OpenCode config first.");
  }

  await git(run, options.workspace, ["pull", "--ff-only"]);
  const imported = await importToolConfigs(tools, options.workspace);
  await git(run, options.workspace, ["add", "."]);
  const status = await run("git", ["status", "--porcelain"], { cwd: options.workspace });
  if (status.code !== 0) {
    throw new Error(`git status --porcelain failed: ${status.stderr || status.stdout}`.trim());
  }

  if (status.stdout.trim().length === 0) {
    return { imported, changed: false };
  }

  await git(run, options.workspace, ["commit", "-m", "chore: update agent spec config"]);
  await git(run, options.workspace, ["push"]);

  return { imported, changed: true };
}
