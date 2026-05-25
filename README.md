# Agent Spec

Agent Spec is a CLI-first open source project for managing AI agent configuration across tools.

The current MVP treats Claude-style configuration as the canonical base, then helps import, push, and pull that configuration across:

- Claude Code
- Codex
- OpenCode

Agent Spec is local-first and GitHub-backed. It uses normal files, normal Git commits, and the GitHub CLI (`gh`) instead of a hosted sync service.

## Why

AI agent tools use different conventions for prompts, skills, MCP servers, plugins, and runtime configuration.

That creates drift:

- `CLAUDE.md` may contain one set of instructions.
- `AGENTS.md` may contain another.
- Skills may live in different folders depending on the tool.
- Moving to another machine often means copying the same files again.

Agent Spec gives those files one Git-backed home and provides adapters for the tools you use locally.

## Current Behavior

### Import and Merge

`agentspec init` and `agentspec push` scan supported local tool config directories and merge them into one workspace.

Prompt files are appended into the canonical `CLAUDE.md` with source headings:

```md
## From Claude Code

...

## From Codex

...

## From OpenCode

...
```

Shared folders such as `skills/`, `mcp/`, and `plugins/` are also merged into the Claude-style workspace folders when present. This applies to both `init` and `push`, so changes made under Codex or OpenCode are still collected into the canonical Agent Spec repository.

### Pull

`agentspec pull` applies the canonical workspace back to supported local tools.

By default it writes to discovered local tool config directories. For inspection or testing, use `--output-dir` to write converted files somewhere else.

## Install

For development:

```bash
npm install
npm run build
```

Install from npm:

```bash
npm install -g @eddyli1989/agent-spec
agentspec --help
```

Run the compiled CLI:

```bash
node dist/src/cli.js --help
```

Build a standalone binary with Bun:

```bash
npm run build:binary
./dist-bin/agentspec --help
```

## Requirements

- Node.js for development.
- Bun for standalone binary builds.
- Git.
- GitHub CLI (`gh`) for `auth` and `init`.

Authenticate with GitHub:

```bash
gh auth login
```

or:

```bash
agentspec auth
```

## Commands

```bash
agentspec init [workspace] [--home <dir>]
agentspec push [workspace] [--home <dir>]
agentspec pull [workspace] [--output-dir <dir>] [--home <dir>]
agentspec auth
agentspec doctor
agentspec --help
```

### `init`

Scans supported local tool configuration, merges it into an Agent Spec workspace, creates a GitHub repository, commits the initial files, and pushes them.

The default repository name is `agent-spec`. If that repository already exists and looks like an Agent Spec configuration repository, Agent Spec clones it into the requested workspace. If it exists but appears to be a source repository or another unrelated project, Agent Spec falls back to numbered names such as `agent-spec-01`, `agent-spec-02`, and so on.

```bash
agentspec init ~/agent-spec
```

### `push`

Pulls the workspace, rescans local configuration, merges changes, and pushes a new commit only when files changed.

```bash
agentspec push ~/agent-spec
```

`agentspec update` is currently kept as a compatibility alias for `agentspec push`.

### `pull`

Pulls the workspace and applies the canonical configuration to supported tools found on the machine.

```bash
agentspec pull ~/agent-spec
```

Inspect converted output without touching real tool config directories:

```bash
agentspec pull ~/agent-spec --output-dir /tmp/agent-spec-output
```

`agentspec sync` is currently kept as a compatibility alias for `agentspec pull`.

### `auth`

Delegates GitHub authentication to `gh auth login`.

```bash
agentspec auth
```

### `doctor`

Currently a placeholder for future environment checks.

```bash
agentspec doctor
```

## Testing

```bash
npm test
npm run build
npm run build:binary
```

## Project Status

Agent Spec is early MVP software.

Implemented:

- CLI command dispatch.
- Tool discovery for Claude Code, Codex, and OpenCode.
- Prompt merge into canonical `CLAUDE.md`.
- Merging of `skills/`, `mcp/`, and `plugins/` into Claude-style workspace folders when present.
- GitHub repository creation through `gh`.
- Existing repository recovery during `init`.
- `pull --output-dir` for safe inspection.
- Standalone binary build through Bun.

Not implemented yet:

- Conflict resolution beyond simple append/copy behavior.
- Prompt de-duplication.
- Rich MCP format adaptation.
- Secret handling.
- Desktop UI.
- Release packaging for all platforms.

## Design Notes

See [PROPOSAL.md](./PROPOSAL.md) for the project proposal and longer-term direction.
