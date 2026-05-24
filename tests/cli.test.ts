import { describe, expect, test } from "vitest";
import { runCli } from "../src/cli.js";

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
});
