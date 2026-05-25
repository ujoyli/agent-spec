import { access, mkdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { discoverTools } from "../core/discovery.js";
import {
  createRepository,
  defaultRunner,
  git,
  type CommandRunner,
  viewRepository,
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
  mode: "created" | "pulled";
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isConfigRepository(workspace: string): Promise<boolean> {
  const markers = [
    ".agent-spec.json",
    "CLAUDE.md",
    "skills",
    "mcp",
    "plugins",
    "prompts",
  ];

  for (const marker of markers) {
    if (await exists(join(workspace, marker))) {
      return true;
    }
  }

  return false;
}

function repoName(base: string, index: number): string {
  return index === 0 ? base : `${base}-${String(index).padStart(2, "0")}`;
}

async function createAvailableRepository(
  run: CommandRunner,
  startIndex: number,
): Promise<{ name: string; url: string }> {
  for (let index = startIndex; index < startIndex + 20; index += 1) {
    const name = repoName("agent-spec", index);
    try {
      return await createRepository(name, run);
    } catch {
      continue;
    }
  }

  throw new Error("Could not create an available Agent Spec repository.");
}

export async function initCommand(options: InitOptions): Promise<InitResult> {
  const run = options.run ?? defaultRunner;
  await mkdir(options.workspace, { recursive: true });

  let repository: { name: string; url: string };
  let mode: "created" | "pulled" = "created";
  try {
    repository = await createRepository("agent-spec", run);
  } catch {
    repository = await viewRepository("agent-spec", run);
    await git(run, process.cwd(), ["clone", repository.url, options.workspace]);
    if (!(await isConfigRepository(options.workspace))) {
      await rm(options.workspace, { recursive: true, force: true });
      await mkdir(options.workspace, { recursive: true });
      repository = await createAvailableRepository(run, 1);
    } else {
      mode = "pulled";
    }
  }

  if (mode === "pulled") {
    await writeState(options.workspace, {
      repository: {
        name: repository.name,
        url: repository.url,
      },
      workspace: options.workspace,
    });
    return {
      createdRepository: repository.name,
      imported: [],
      mode: "pulled",
    };
  }

  const tools = await discoverTools(options.home);
  if (tools.length === 0) {
    throw new Error("No supported agent configuration was found. Create Claude Code, Codex, or OpenCode config first.");
  }

  const imported = await importToolConfigs(tools, options.workspace);

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
    mode,
  };
}
