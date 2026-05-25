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

export async function ghAuthLogin(run: CommandRunner = defaultRunner): Promise<void> {
  ensureSuccess(await run("gh", ["auth", "login"]), "GitHub authentication failed");
}

export async function createRepository(
  baseName: string,
  run: CommandRunner = defaultRunner,
): Promise<{ name: string; url: string }> {
  const result = await run("gh", ["repo", "create", baseName, "--private"]);
  ensureSuccess(result, `Could not create GitHub repository ${baseName}`);
  return { name: baseName, url: result.stdout.trim() };
}

export async function viewRepository(
  name: string,
  run: CommandRunner = defaultRunner,
): Promise<{ name: string; url: string }> {
  const result = await run("gh", ["repo", "view", name, "--json", "name,url"]);
  ensureSuccess(result, `Could not view GitHub repository ${name}`);
  return JSON.parse(result.stdout) as { name: string; url: string };
}

export async function git(run: CommandRunner, cwd: string, args: string[]): Promise<void> {
  ensureSuccess(await run("git", args, { cwd }), `git ${args.join(" ")} failed`);
}
