import { describe, expect, test } from "vitest";
import { createRepositoryWithFallback, ghAuthLogin } from "../src/core/github.js";

describe("github", () => {
  test("delegates auth login to gh", async () => {
    const calls: string[][] = [];

    await ghAuthLogin(async (command, args) => {
      calls.push([command, ...args]);
      return { code: 0, stdout: "", stderr: "" };
    });

    expect(calls).toEqual([["gh", "auth", "login"]]);
  });

  test("tries numbered repository names until creation succeeds", async () => {
    const calls: string[][] = [];

    const repo = await createRepositoryWithFallback(
      "agent-spec",
      async (command, args) => {
        calls.push([command, ...args]);
        if (args.includes("agent-spec") || args.includes("agent-spec-01")) {
          return { code: 1, stdout: "", stderr: "name already exists" };
        }
        return { code: 0, stdout: "https://github.com/octo/agent-spec-02.git\n", stderr: "" };
      },
      3,
    );

    expect(repo).toEqual({
      name: "agent-spec-02",
      url: "https://github.com/octo/agent-spec-02.git",
    });
    expect(calls.map((call) => call[3])).toEqual(["agent-spec", "agent-spec-01", "agent-spec-02"]);
  });
});
