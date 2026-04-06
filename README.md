# Project Tracker

Bootstrap and upgrade a repository's delivery process without hand-assembling the same project scaffolding every time.

`project-tracker` sets up the project-level artifacts that make execution predictable: config, policies, templates, and upgrade rules. It is meant for repository setup and process evolution, not day-to-day feature delivery.

## Why This Exists

Most teams do not fail because they cannot write code. They fail because every new repository starts with a vague process, inconsistent templates, and undocumented decisions about how work should move.

`project-tracker` solves that by turning repository setup into a repeatable operation:

- bootstrap a new repository with one process contract
- upgrade an existing repository when the process evolves
- keep project-level artifacts consistent across repositories
- reduce drift between "how this repo should work" and "what is actually in the repo"

## What It Creates

When you bootstrap a repository, `project-tracker` prepares a project-owned process layer, including:

- `rep.config.json`
- `tasks/_policies/arch-patterns.md`
- `tasks/_policies/dev-plan.md`
- `tasks/_policies/project-patterns.md`
- `tasks/_inbox/retro-inbox.md`
- `tasks/_templates/*`
- managed sections in `AGENTS.md`

The result is a repository that can run from explicit local artifacts instead of ad hoc instructions.

## When To Use It

Use `project-tracker` when you need to:

- initialize a new repository's working process
- upgrade an existing repository to the current process contract
- roll out project-level template or policy changes across repositories

Do not use it for normal feature execution inside an already bootstrapped repository. This repository owns process setup and process upgrades.

## Companion Workflow

After a repository is bootstrapped, the workflow splits into two tracks:

- this repository continues to own bootstrap, upgrade, and process rollout
- day-to-day task execution should continue through [ai-meatbags/task-tracker-skill](https://github.com/ai-meatbags/task-tracker-skill)

That includes:

- bootstrap improvements
- upgrade logic
- policy and template evolution
- cross-repository rollout of process changes

This boundary matters. If setup logic and execution logic are mixed together, the process becomes harder to upgrade and much easier to drift.

## How It Works

`project-tracker` combines two layers:

- `SKILL.md` defines the operating contract, decision rules, and upgrade behavior
- `scripts/bootstrap_project.js` performs deterministic file materialization

The script is intentionally narrow. It writes known artifacts. It does not own repository-specific reasoning, manual follow-up decisions, or upgrade planning.

## Repository Layout

- `SKILL.md` — skill contract and operating rules
- `scripts/bootstrap_project.js` — deterministic bootstrap and upgrade helper
- `references/` — templates and seed files copied into target repositories

## Quick Start

Dry run:

```bash
node scripts/bootstrap_project.js \
  --task-prefix PROJECT \
  --task-sync-mode local+linear \
  --project-root /path/to/project
```

Apply changes:

```bash
node scripts/bootstrap_project.js \
  --task-prefix PROJECT \
  --task-sync-mode local+linear \
  --project-root /path/to/project \
  --apply
```

If `--project-root` is omitted, the current directory is used.

## Output Model

Bootstrap creates missing project-level artifacts.

Upgrade reviews the current repository state and applies managed updates where it is safe to do so. Existing repository-specific content is preserved when the contract says it should be preserved.

## Intended Outcome

The goal is not "more templates." The goal is a repository that is easier to operate:

- clearer project rules
- less setup ambiguity
- safer upgrades
- lower process drift over time

If you maintain multiple repositories and want them to evolve under one process contract, this is the layer that should own that responsibility.
