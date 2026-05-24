import { ghAuthLogin, type CommandRunner, defaultRunner } from "../core/github.js";

export interface AuthOptions {
  run?: CommandRunner;
}

export async function authCommand(options: AuthOptions = {}): Promise<void> {
  await ghAuthLogin(options.run ?? defaultRunner);
}

