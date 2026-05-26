import { resolve } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { runCli } from "../src/cli.js";
import * as initModule from "../src/commands/init.js";
import * as syncModule from "../src/commands/sync.js";
import * as updateModule from "../src/commands/update.js";

vi.mock("node:os", () => ({
  homedir: () => "/tmp/home",
}));

describe("runCli", () => {
  test("prints help for --help", async () => {
    const output: string[] = [];

    const code = await runCli(["--help"], {
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("agentspec init");
    expect(output.join("\n")).toContain("agentspec init [--offline]");
    expect(output.join("\n")).toContain("agentspec push");
    expect(output.join("\n")).toContain("agentspec pull");
    expect(output.join("\n")).not.toContain("[workspace]");
    expect(output.join("\n")).not.toContain("--home");
  });

  test("passes --output-dir to pull command", async () => {
    const output: string[] = [];
    const sync = vi.spyOn(syncModule, "syncCommand").mockResolvedValue({
      syncedTargets: ["codex"],
    });

    const code = await runCli(["pull", "--output-dir", "/tmp/converted"], {
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });

    expect(code).toBe(0);
    expect(sync).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: resolve("/tmp/home/.agentspec"),
        outputDir: resolve("/tmp/converted"),
      }),
    );

    sync.mockRestore();
  });

  test("keeps sync as a pull compatibility alias with default home workspace", async () => {
    const sync = vi.spyOn(syncModule, "syncCommand").mockResolvedValue({
      syncedTargets: [],
    });

    const code = await runCli(["sync"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(sync).toHaveBeenCalledWith(
      expect.objectContaining({
        home: "/tmp/home",
        workspace: resolve("/tmp/home/.agentspec"),
      }),
    );

    sync.mockRestore();
  });

  test("ignores positional workspace arguments and uses the home workspace", async () => {
    const sync = vi.spyOn(syncModule, "syncCommand").mockResolvedValue({
      syncedTargets: ["codex"],
    });

    const code = await runCli(["sync", "/tmp/old-workspace"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(sync).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: resolve("/tmp/home/.agentspec"),
      }),
    );

    sync.mockRestore();
  });

  test("ignores removed --home option", async () => {
    const sync = vi.spyOn(syncModule, "syncCommand").mockResolvedValue({
      syncedTargets: ["codex"],
    });

    const code = await runCli(["sync", "--home", "/tmp/other-home"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(sync).toHaveBeenCalledWith(
      expect.objectContaining({
        home: "/tmp/home",
        workspace: resolve("/tmp/home/.agentspec"),
      }),
    );

    sync.mockRestore();
  });

  test("uses default home workspace for push command", async () => {
    const update = vi.spyOn(updateModule, "updateCommand").mockResolvedValue({
      imported: ["CLAUDE.md"],
      changed: true,
    });

    const code = await runCli(["push"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        home: "/tmp/home",
        workspace: resolve("/tmp/home/.agentspec"),
      }),
    );

    update.mockRestore();
  });

  test("init uses home workspace", async () => {
    const init = vi.spyOn(initModule, "initCommand").mockResolvedValue({
      createdRepository: "agent-spec",
      imported: [],
      mode: "pulled",
    });

    const code = await runCli(["init"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        home: "/tmp/home",
        workspace: resolve("/tmp/home/.agentspec"),
      }),
    );

    init.mockRestore();
  });

  test("passes offline option to init command", async () => {
    const output: string[] = [];
    const init = vi.spyOn(initModule, "initCommand").mockResolvedValue({
      imported: ["CLAUDE.md"],
      mode: "offline",
    });

    const code = await runCli(["init", "--offline"], {
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });

    expect(code).toBe(0);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        offline: true,
      }),
    );
    expect(output.join("\n")).toContain("Initialized local agent spec config with 1 imported files.");

    init.mockRestore();
  });

  test("keeps update as a push compatibility alias", async () => {
    const update = vi.spyOn(updateModule, "updateCommand").mockResolvedValue({
      imported: ["CLAUDE.md"],
      changed: true,
    });

    const code = await runCli(["update"], {
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        home: "/tmp/home",
        workspace: resolve("/tmp/home/.agentspec"),
      }),
    );

    update.mockRestore();
  });
});
