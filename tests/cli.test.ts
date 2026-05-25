import { resolve } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { runCli } from "../src/cli.js";
import * as initModule from "../src/commands/init.js";
import * as syncModule from "../src/commands/sync.js";
import * as updateModule from "../src/commands/update.js";
import * as stateModule from "../src/core/state.js";

describe("runCli", () => {
  test("prints help for --help", async () => {
    const output: string[] = [];

    const code = await runCli(["--help"], {
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("agentspec init");
    expect(output.join("\n")).toContain("agentspec push");
    expect(output.join("\n")).toContain("agentspec pull");
  });

  test("passes --output-dir to pull command", async () => {
    const output: string[] = [];
    const sync = vi.spyOn(syncModule, "syncCommand").mockResolvedValue({
      syncedTargets: ["codex"],
    });

    const code = await runCli(["pull", "/tmp/workspace", "--output-dir", "/tmp/converted"], {
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });

    expect(code).toBe(0);
    expect(sync).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: resolve("/tmp/workspace"),
        outputDir: resolve("/tmp/converted"),
      }),
    );

    sync.mockRestore();
  });

  test("keeps sync as a pull compatibility alias", async () => {
    const sync = vi.spyOn(syncModule, "syncCommand").mockResolvedValue({
      syncedTargets: [],
    });

    const code = await runCli(["sync", "/tmp/workspace", "--home", "/tmp/home"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(sync).toHaveBeenCalledWith(
      expect.objectContaining({
        home: "/tmp/home",
        workspace: resolve("/tmp/workspace"),
      }),
    );

    sync.mockRestore();
  });

  test("uses global default workspace for sync when no workspace argument is provided", async () => {
    const sync = vi.spyOn(syncModule, "syncCommand").mockResolvedValue({
      syncedTargets: ["codex"],
    });
    const readGlobal = vi.spyOn(stateModule, "readGlobalState").mockResolvedValue({
      defaultWorkspace: "/tmp/default-agent-spec",
    });

    const code = await runCli(["sync", "--home", "/tmp/home"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(readGlobal).toHaveBeenCalledWith("/tmp/home");
    expect(sync).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: resolve("/tmp/default-agent-spec"),
      }),
    );

    sync.mockRestore();
    readGlobal.mockRestore();
  });

  test("passes --home override to push command", async () => {
    const update = vi.spyOn(updateModule, "updateCommand").mockResolvedValue({
      imported: ["CLAUDE.md"],
      changed: true,
    });

    const code = await runCli(["push", "/tmp/workspace", "--home", "/tmp/home"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        home: "/tmp/home",
        workspace: resolve("/tmp/workspace"),
      }),
    );

    update.mockRestore();
  });

  test("init writes global default workspace", async () => {
    const init = vi.spyOn(initModule, "initCommand").mockResolvedValue({
      createdRepository: "agent-spec",
      imported: [],
      mode: "pulled",
    });
    const writeGlobal = vi.spyOn(stateModule, "writeGlobalState").mockResolvedValue(undefined);

    const code = await runCli(["init", "/tmp/workspace", "--home", "/tmp/home"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(writeGlobal).toHaveBeenCalledWith("/tmp/home", {
      defaultWorkspace: resolve("/tmp/workspace"),
    });

    init.mockRestore();
    writeGlobal.mockRestore();
  });

  test("keeps update as a push compatibility alias", async () => {
    const update = vi.spyOn(updateModule, "updateCommand").mockResolvedValue({
      imported: ["CLAUDE.md"],
      changed: true,
    });

    const code = await runCli(["update", "/tmp/workspace", "--home", "/tmp/home"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        home: "/tmp/home",
        workspace: resolve("/tmp/workspace"),
      }),
    );

    update.mockRestore();
  });
});
