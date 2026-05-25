import { describe, expect, test } from "vitest";
import { createRepository, ghAuthLogin, viewRepository } from "../src/core/github.js";

describe("github", () => {
  test("delegates auth login to gh", async () => {
    const calls: string[][] = [];

    await ghAuthLogin(async (command, args) => {
      calls.push([command, ...args]);
      return { code: 0, stdout: "", stderr: "" };
    });

    expect(calls).toEqual([["gh", "auth", "login"]]);
  });

  test("creates repository with gh", async () => {
    const calls: string[][] = [];

    const repo = await createRepository("agent-spec", async (command, args) => {
      calls.push([command, ...args]);
      return { code: 0, stdout: "https://github.com/octo/agent-spec.git\n", stderr: "" };
    });

    expect(repo).toEqual({
      name: "agent-spec",
      url: "https://github.com/octo/agent-spec.git",
    });
    expect(calls).toEqual([["gh", "repo", "create", "agent-spec", "--private"]]);
  });

  test("views existing repository metadata", async () => {
    const repo = await viewRepository("agent-spec", async () => ({
      code: 0,
      stdout: "{\"name\":\"agent-spec\",\"url\":\"https://github.com/octo/agent-spec\"}\n",
      stderr: "",
    }));

    expect(repo).toEqual({
      name: "agent-spec",
      url: "https://github.com/octo/agent-spec",
    });
  });
});
