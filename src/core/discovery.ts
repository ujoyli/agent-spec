import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { candidateToolPaths, type ToolPath } from "./paths.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function discoverTools(home: string): Promise<ToolPath[]> {
  const found: ToolPath[] = [];

  for (const candidate of candidateToolPaths(home)) {
    if (await exists(candidate.configDir)) {
      found.push(candidate);
    }
  }

  return found;
}

