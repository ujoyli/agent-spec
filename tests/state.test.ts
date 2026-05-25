import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { readGlobalState, readState, writeGlobalState, writeState } from "../src/core/state.js";

describe("state", () => {
  test("returns empty state when no state file exists", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-state-"));

    await expect(readState(workspace)).resolves.toEqual({});
  });

  test("writes and reads repository state", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "agentspec-state-"));

    await writeState(workspace, {
      repository: {
        owner: "octo",
        name: "agent-spec",
        url: "https://github.com/octo/agent-spec.git",
      },
    });

    await expect(readState(workspace)).resolves.toEqual({
      repository: {
        owner: "octo",
        name: "agent-spec",
        url: "https://github.com/octo/agent-spec.git",
      },
    });
  });

  test("writes and reads global default workspace", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentspec-global-state-"));

    await writeGlobalState(home, {
      defaultWorkspace: "/tmp/agent-spec",
    });

    await expect(readGlobalState(home)).resolves.toEqual({
      defaultWorkspace: "/tmp/agent-spec",
    });
  });
});
