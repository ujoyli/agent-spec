# Agent Spec CLI MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Agent Spec CLI MVP with `auth`, `init`, and `sync` around Claude-based canonical configuration.

**Architecture:** The CLI is a small TypeScript Node.js application. Core behavior is split into focused modules for tool discovery, file copying, GitHub repository setup through `gh`, local state, and command orchestration.

**Tech Stack:** Node.js, TypeScript, Vitest, npm package scripts, built-in `fs`, `path`, `os`, and `child_process`.

---

## File Structure

- `package.json`: package metadata, CLI bin, scripts, and dev dependencies.
- `tsconfig.json`: TypeScript compiler configuration.
- `src/cli.ts`: command-line entry point and argument dispatch.
- `src/commands/auth.ts`: delegates GitHub authentication to `gh auth login`.
- `src/commands/init.ts`: discovers local configs, creates or connects repository, imports canonical files, commits, and pushes.
- `src/commands/sync.ts`: pulls repository changes and applies configuration to supported tools.
- `src/core/discovery.ts`: finds Claude Code, Codex, and OpenCode config directories.
- `src/core/copy.ts`: copies selected files and directories safely.
- `src/core/state.ts`: reads and writes `.agent-spec.json`.
- `src/core/github.ts`: wraps `gh` and `git` command calls.
- `src/core/paths.ts`: owns default path conventions.
- `tests/*.test.ts`: behavior tests for the core modules and command orchestration.

## Tasks

### Task 1: Scaffold Package and Test Harness

- [ ] Create `package.json`, `tsconfig.json`, and `src/cli.ts`.
- [ ] Add Vitest tests with one smoke test for CLI help.
- [ ] Run `npm test` and verify the smoke test fails before command dispatch exists.
- [ ] Implement minimal command dispatch.
- [ ] Run `npm test` and verify it passes.

### Task 2: Discover Supported Tools

- [ ] Write tests for detecting Claude Code, Codex, and OpenCode directories from an injected home directory.
- [ ] Implement `src/core/paths.ts` and `src/core/discovery.ts`.
- [ ] Run targeted discovery tests.

### Task 3: Manage Local State

- [ ] Write tests for reading missing state, writing repository state, and re-reading it.
- [ ] Implement `src/core/state.ts`.
- [ ] Run targeted state tests.

### Task 4: Copy Canonical Files

- [ ] Write tests for copying Claude-style files into a repository workspace.
- [ ] Write tests for applying repository files into Codex and OpenCode target directories.
- [ ] Implement `src/core/copy.ts`.
- [ ] Run targeted copy tests.

### Task 5: Wrap `gh` and `git`

- [ ] Write tests using injected command runners for auth, repository name fallback, clone, commit, pull, and push flows.
- [ ] Implement `src/core/github.ts`.
- [ ] Run targeted GitHub tests.

### Task 6: Implement Commands

- [ ] Write tests for `auth`, `init`, and `sync` command orchestration with injected dependencies.
- [ ] Implement `src/commands/auth.ts`, `src/commands/init.ts`, and `src/commands/sync.ts`.
- [ ] Wire them in `src/cli.ts`.
- [ ] Run all tests.

### Task 7: Verify CLI Locally

- [ ] Run `npm run build`.
- [ ] Run `node dist/cli.js --help`.
- [ ] Run `node dist/cli.js doctor`.
- [ ] Document any intentionally deferred behavior.

