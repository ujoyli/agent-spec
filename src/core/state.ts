import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface AgentSpecState {
  repository?: {
    owner?: string;
    name: string;
    url: string;
  };
  workspace?: string;
}

export interface AgentSpecGlobalState {
  defaultWorkspace?: string;
}

export const stateFileName = ".agent-spec.json";
export const globalStateFileName = "config.json";

export function statePath(workspace: string): string {
  return join(workspace, stateFileName);
}

export function globalStatePath(home: string): string {
  return join(home, ".agent-spec", globalStateFileName);
}

export async function readState(workspace: string): Promise<AgentSpecState> {
  try {
    const raw = await readFile(statePath(workspace), "utf8");
    return JSON.parse(raw) as AgentSpecState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function writeState(workspace: string, state: AgentSpecState): Promise<void> {
  const path = statePath(workspace);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`);
}

export async function readGlobalState(home: string): Promise<AgentSpecGlobalState> {
  try {
    const raw = await readFile(globalStatePath(home), "utf8");
    return JSON.parse(raw) as AgentSpecGlobalState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function writeGlobalState(home: string, state: AgentSpecGlobalState): Promise<void> {
  const path = globalStatePath(home);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`);
}
