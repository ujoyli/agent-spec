import { spawn } from "node:child_process";

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type CommandRunner = (
  command: string,
  args: string[],
  options?: { cwd?: string },
) => Promise<CommandResult>;

export const defaultRunner: CommandRunner = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });

function ensureSuccess(result: CommandResult, message: string): void {
  if (result.code !== 0) {
    throw new Error(`${message}: ${result.stderr || result.stdout}`.trim());
  }
}

function repoName(base: string, index: number): string {
  if (index === 0) {
    return base;
  }
  return `${base}-${String(index).padStart(2, "0")}`;
}

export async function ghAuthLogin(run: CommandRunner = defaultRunner): Promise<void> {
  ensureSuccess(await run("gh", ["auth", "login"]), "GitHub authentication failed");
}

export async function createRepositoryWithFallback(
  baseName: string,
  run: CommandRunner = defaultRunner,
  maxAttempts = 20,
): Promise<{ name: string; url: string }> {
  for (let index = 0; index < maxAttempts; index += 1) {
    const name = repoName(baseName, index);
    const result = await run("gh", ["repo", "create", name, "--private"]);
    if (result.code === 0) {
      return { name, url: result.stdout.trim() };
    }
  }

  throw new Error(`Could not create a GitHub repository after ${maxAttempts} attempts.`);
}

export async function git(run: CommandRunner, cwd: string, args: string[]): Promise<void> {
  ensureSuccess(await run("git", args, { cwd }), `git ${args.join(" ")} failed`);
}
