#!/usr/bin/env node
import { homedir } from "node:os";
import { resolve } from "node:path";
import { authCommand } from "./commands/auth.js";
import { initCommand } from "./commands/init.js";
import { syncCommand } from "./commands/sync.js";
import { updateCommand } from "./commands/update.js";

export interface CliIo {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

const defaultIo: CliIo = {
  stdout: (line) => console.log(line),
  stderr: (line) => console.error(line),
};

function helpText(): string {
  return [
    "Agent Spec",
    "",
    "Usage:",
    "  agentspec init [workspace] [--home <dir>]",
    "  agentspec push [workspace] [--home <dir>]",
    "  agentspec pull [workspace] [--output-dir <dir>] [--home <dir>]",
    "  agentspec auth",
    "  agentspec doctor",
    "  agentspec --help",
  ].join("\n");
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

export async function runCli(args: string[], io: CliIo = defaultIo): Promise<number> {
  const [command] = args;
  const valueOptions = new Set(["--output-dir", "--home"]);
  const workspaceArg = args.find(
    (arg, index) => index > 0 && !arg.startsWith("--") && !valueOptions.has(args[index - 1] ?? ""),
  );
  const workspace = resolve(workspaceArg ?? process.cwd());
  const home = optionValue(args, "--home") ?? homedir();

  try {
    if (!command || command === "--help" || command === "-h") {
      io.stdout(helpText());
      return 0;
    }

    if (command === "auth") {
      await authCommand();
      io.stdout("GitHub authentication completed.");
      return 0;
    }

    if (command === "init") {
      const result = await initCommand({ home, workspace });
      if (result.mode === "pulled") {
        io.stdout(`Initialized from existing ${result.createdRepository} repository.`);
      } else {
        io.stdout(`Initialized ${result.createdRepository} with ${result.imported.length} imported files.`);
      }
      return 0;
    }

    if (command === "push" || command === "update") {
      const result = await updateCommand({ home, workspace });
      const status = result.changed ? "Updated" : "No changes found after scanning";
      io.stdout(`${status} agent spec config with ${result.imported.length} imported files.`);
      return 0;
    }

    if (command === "pull" || command === "sync") {
      const outputDir = optionValue(args, "--output-dir");
      const result = await syncCommand({
        home,
        workspace,
        outputDir: outputDir ? resolve(outputDir) : undefined,
      });
      io.stdout(`Synced ${result.syncedTargets.length} target(s): ${result.syncedTargets.join(", ") || "none"}.`);
      return 0;
    }

    if (command === "doctor") {
      io.stdout("Agent Spec doctor is available. Detailed checks are coming next.");
      return 0;
    }

    io.stderr(`Unknown command: ${command}\n\n${helpText()}`);
    return 1;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = await runCli(process.argv.slice(2));
  process.exitCode = code;
}
