# Agent Spec Proposal

## Summary

Agent Spec is a CLI-first open source project for managing, syncing, and adapting AI agent prompts, skills, MCP servers, plugins, and related configuration across different AI coding and agent tools.

Modern AI agent tools such as Codex, Claude Code, OpenCode, Qwen Code Copilot, and others each define their own conventions for system prompts, skill folders, plugin configuration, MCP setup, and runtime behavior. This fragmentation makes it difficult for users to switch between tools, work across multiple machines, or maintain a consistent agent environment over time.

Agent Spec proposes a version-controlled source of truth for AI agent configuration. For the first version, Claude Code configuration is treated as the canonical base format. Users can import or maintain their setup in that shape, then Agent Spec can convert and apply it to other supported tools.

## Motivation

AI agent workflows are becoming increasingly personal and increasingly fragmented.

Users often maintain:

- Global and project-specific system prompts.
- Reusable skills, workflows, and instructions.
- MCP server configuration.
- Plugin and connector settings.
- Tool-specific files such as `AGENTS.md`, `CLAUDE.md`, skill directories, or other local conventions.
- Machine-specific overrides for paths, secrets, shells, runtimes, or operating systems.

Today, these assets are usually duplicated manually across tools and computers. This creates several problems:

- Configuration drifts over time.
- Switching agent tools requires rewriting or copying instructions.
- Skills are difficult to reuse across ecosystems.
- It is unclear which file is the canonical source of truth.
- Sharing a complete agent setup with another person or machine is unnecessarily hard.
- Users cannot easily version, review, or roll back changes to their agent environment.

Agent Spec exists to make agent configuration portable, inspectable, and maintainable.

## Goals

Agent Spec should eventually provide:

- A Claude-based canonical configuration repository for prompts, skills, MCP servers, plugins, and related files.
- Tool adapters that can convert Claude-based configuration into platform-specific formats.
- A CLI for initializing, syncing, and applying configuration.
- GitHub repository integration through the `gh` CLI.
- A cross-platform design that can support macOS, Windows, Linux, and headless environments.
- A path toward an optional second-version desktop UI for browsing, editing, comparing, and syncing agent configuration.

## Non-Goals

Agent Spec should not initially try to:

- Become a commercial agent marketplace.
- Replace existing AI coding tools.
- Define a completely new configuration format before it is needed.
- Define how every agent runtime must execute tasks.
- Store secrets directly in the repository.
- Abstract away every difference between agent platforms.
- Provide a hosted sync service as a required dependency.

The first version should focus on a CLI, Claude-compatible source files, local transparent files, and GitHub sync through `gh`.

## Core Concepts

### Workspace

An Agent Spec workspace is the root directory that contains the canonical Claude-based configuration for one user, team, or project.

Example:

```text
agent-spec/
  .agent-spec.json
  CLAUDE.md
  skills/
  mcp/
  plugins/
```

### Local State

Agent Spec should keep local state so it can remember the user's GitHub repository and avoid asking repeated setup questions.

Possible local state:

- Repository owner.
- Repository name.
- Repository clone path.
- Last initialized targets.
- Tool paths discovered on the current machine.

This state can be stored in a small local file such as `.agent-spec.json` inside the workspace.

### Canonical Claude Configuration

Agent Spec should use Claude Code conventions as the base configuration shape in the first version.

This keeps the MVP practical:

- No new manifest format is required for user-authored agent behavior.
- Existing Claude Code configuration can be copied into the repository directly.
- Other tools can be treated as export targets.
- The project can prove value before standardizing its own schema.

### Prompts

Prompts are reusable instruction files from the Claude-style base configuration.

The first version should detect and preserve files such as `CLAUDE.md` and related prompt documents, then map them to target-tool equivalents where possible.

### Skills

Skills are reusable task-specific workflows, templates, scripts, or instructions.

Agent Spec should support:

- Claude-style skills as the canonical base.
- Conversion or copying into Codex and OpenCode-compatible locations.
- Future adapters for additional skill formats.

The first version should avoid inventing a new skill schema unless conversion requires small adapter metadata.

### MCP Servers

MCP configuration should be copied or adapted from the Claude-based source into each target tool's expected format.

Agent Spec should support:

- Named MCP servers.
- Transport configuration.
- Environment variable references.
- Per-profile enablement.
- Platform-specific overrides.

Secrets should be referenced, not stored directly.

### Plugins and Connectors

Agent Spec should track plugin-related configuration where possible, while acknowledging that each tool may have different plugin installation and permission models.

The initial goal is configuration portability, not automatic installation for every platform.

### Profiles

Profiles are useful, but they are not part of the first MVP unless they already exist in the imported Claude configuration.

Example profiles:

- `default`
- `work`
- `personal`
- `minimal`
- `research`
- `coding`
- `review`

Profiles can be revisited after the basic `init`, `push`, and `pull` loop works.

### Adapters

Adapters translate Claude-based Agent Spec configuration into tool-specific output.

First targets:

- Codex
- Claude Code
- OpenCode

Adapters should be explicit and inspectable. Users should be able to preview what will be written before syncing.

## Proposed CLI

The CLI name should be:

```bash
agentspec
```

MVP commands:

```bash
agentspec init
agentspec push
agentspec pull
agentspec doctor
agentspec auth
```

`agentspec init` should scan local Claude Code, Codex, and OpenCode configuration directories, normalize what it can into the Claude-based repository shape, create or connect a GitHub repository, commit the first version, and push it. If the default repository already exists and looks like an Agent Spec configuration repository, `init` should recover it locally and behave like the first pull path. If it exists but appears to be a source repository or unrelated project, `init` should fall back to numbered repository names.

`agentspec push` should scan local tool configuration, merge it into the canonical workspace, commit changed files, and push the repository.

`agentspec pull` should pull the latest repository changes and apply the canonical Claude-based configuration to all supported tools found on the machine. The first supported tools are Claude Code, OpenCode, and Codex.

`agentspec auth` should guide the user through GitHub authentication by delegating to the `gh` CLI.

The CLI should prioritize safety:

- Preview changes before writing where practical.
- Avoid overwriting user files without confirmation.
- Keep generated files clearly marked where possible.
- Support dry runs over time.
- Produce readable summaries.

## GitHub Repository Integration

Agent Spec should use GitHub as the first sync backend.

For the MVP:

- The CLI should call `gh` instead of implementing OAuth directly.
- If the user is not authenticated, the CLI should guide them to run `gh auth login` or delegate through `agentspec auth`.
- If the user does not already have a repository configured, Agent Spec should create one.
- The default repository name should be `agent-spec`.
- If `agent-spec` already exists, the CLI should inspect whether it looks like an Agent Spec configuration repository. If it does, pull it locally. If it does not, try numbered fallback names such as `agent-spec-01`.
- The selected repository name should be stored locally so future commands know where to sync.

## Proposed Desktop UI

A desktop UI is explicitly deferred to the second version, but the project should be designed so a UI can be added later.

Useful UI features could include:

- Browse prompts, skills, MCP servers, plugins, and profiles.
- Compare canonical Agent Spec files with generated target-tool files.
- Enable or disable components per profile.
- Preview sync changes before applying them.
- Show validation errors and missing dependencies.
- Provide a guided import flow from existing tools.

The UI should be cross-platform and should not become the only way to use the project. The CLI should remain the core interface.

## Technical Direction

Agent Spec should start as a CLI-first, local-file-based project with GitHub sync.

Recommended early principles:

- Use plain text formats where possible.
- Prefer existing Claude Code files as the canonical user-authored format.
- Use small JSON files only for Agent Spec local state when needed.
- Keep prompts and skills easy to inspect in Git.
- Separate canonical source files from generated target files.
- Treat adapters as deterministic transformations.
- Support cross-platform paths and overrides from the beginning.

The initial implementation can be built with a cross-platform runtime such as Node.js, Deno, Rust, Go, or Python. Node.js with TypeScript is a strong first choice because it is portable, easy to distribute as a CLI, and well-suited for filesystem-heavy tooling.

## MVP Scope

The first milestone should prove that Agent Spec can use Claude-style configuration as the canonical base, store it in GitHub, and apply it to Claude Code, OpenCode, and Codex.

Proposed MVP:

- Implement `agentspec init`.
- Implement `agentspec push`.
- Implement `agentspec pull`.
- Implement `agentspec auth`.
- Detect local Claude Code, Codex, and OpenCode configuration directories.
- Import discovered configuration into a Claude-based repository layout.
- Create a GitHub repository through `gh`, defaulting to `agent-spec`.
- Recover the existing `agent-spec` repository when it already exists and looks like a configuration repository; otherwise fall back to a numbered repository.
- Commit and push the initial configuration.
- Pull and apply repository changes to supported local tools.
- Write clear documentation and examples.

## Open Questions

- What exact Claude Code files should be treated as canonical in v1?
- How should skills be copied when target tools have different skill directory conventions?
- How much should adapters normalize differences between tools versus preserving tool-specific features?
- Should generated target files be committed to Git or treated as local build artifacts?
- How should machine-specific configuration be modeled?
- What is the safest import strategy for existing user configurations?
- How should conflicts be handled when a target tool already has local changes?

## Success Criteria

Agent Spec is successful if a user can:

- Keep their agent configuration in one Git repository.
- Move to a new machine and restore their agent setup quickly.
- Sync Claude-style configuration into Claude Code, Codex, and OpenCode without manually rewriting prompts and skills.
- Review changes to agent behavior through normal Git workflows.
- Share reusable prompts, skills, and profiles with others.

## Suggested Next Steps

1. Scaffold the TypeScript CLI.
2. Implement local tool discovery for Claude Code, Codex, and OpenCode.
3. Implement repository state and GitHub setup through `gh`.
4. Implement `init`.
5. Implement `push` and `pull`.
6. Add examples and usage documentation.
