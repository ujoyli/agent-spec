import { describe, expect, test, vi } from "vitest";
import { runCli } from "../src/cli.js";
import * as syncModule from "../src/commands/sync.js";

describe("runCli", () => {
  test("prints help for --help", async () => {
    const output: string[] = [];

    const code = await runCli(["--help"], {
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("agentspec init");
    expect(output.join("\n")).toContain("agentspec sync");
  });

  test("passes --output-dir to sync command", async () => {
    const output: string[] = [];
    const sync = vi.spyOn(syncModule, "syncCommand").mockResolvedValue({
      syncedTargets: ["codex"],
    });

    const code = await runCli(["sync", "/tmp/workspace", "--output-dir", "/tmp/converted"], {
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });

    expect(code).toBe(0);
    expect(sync).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: "/tmp/workspace",
        outputDir: "/tmp/converted",
      }),
    );

    sync.mockRestore();
  });

  test("passes --home override to sync command", async () => {
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
        workspace: "/tmp/workspace",
      }),
    );

    sync.mockRestore();
  });
});
