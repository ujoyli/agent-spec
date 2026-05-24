import { mkdir } from "node:fs/promises";
import { discoverTools } from "../core/discovery.js";
import {
  createRepositoryWithFallback,
  defaultRunner,
  git,
  type CommandRunner,
} from "../core/github.js";
import { importClaudeBase } from "../core/copy.js";
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
  const claude = tools.find((tool) => tool.name === "claude-code");

  if (!claude) {
    throw new Error("Claude Code configuration was not found. Create ~/.claude first or import it manually.");
  }

  await mkdir(options.workspace, { recursive: true });
  const imported = await importClaudeBase(claude.configDir, options.workspace);
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

