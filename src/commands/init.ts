import { mkdir } from "node:fs/promises";
import { discoverTools } from "../core/discovery.js";
import {
  createRepositoryWithFallback,
  defaultRunner,
  git,
  type CommandRunner,
} from "../core/github.js";
import { importToolConfigs } from "../core/copy.js";
import { writeState } from "../core/state.js";

export interface InitOptions {
  home: string;
  workspace: string;
  run?: CommandRunner;
}

export interface InitResult {
  createdRepository: string;
  imported: string[];
}

export async function initCommand(options: InitOptions): Promise<InitResult> {
  const run = options.run ?? defaultRunner;
  const tools = await discoverTools(options.home);

  if (tools.length === 0) {
    throw new Error("No supported agent configuration was found. Create Claude Code, Codex, or OpenCode config first.");
  }

  await mkdir(options.workspace, { recursive: true });
  const imported = await importToolConfigs(tools, options.workspace);
  const repository = await createRepositoryWithFallback("agent-spec", run);

  await writeState(options.workspace, {
    repository: {
      name: repository.name,
      url: repository.url,
    },
    workspace: options.workspace,
  });

  await git(run, options.workspace, ["init"]);
  await git(run, options.workspace, ["add", "."]);
  await git(run, options.workspace, ["commit", "-m", "chore: initialize agent spec"]);
  await git(run, options.workspace, ["branch", "-M", "main"]);
  await git(run, options.workspace, ["remote", "add", "origin", repository.url]);
  await git(run, options.workspace, ["push", "-u", "origin", "main"]);

  return {
    createdRepository: repository.name,
    imported,
  };
}
