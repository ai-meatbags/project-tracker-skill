# project-tracker

Standalone distribution repository for the `project-tracker` skill.

Repository: [ai-meatbags/project-tracker-skill](https://github.com/ai-meatbags/project-tracker-skill)

## What It Does

`project-tracker` bootstraps and upgrades project-level process artifacts:

- `rep.config.json`
- `tasks/_policies/*`
- `tasks/_templates/*`
- `tasks/_inbox/retro-inbox.md`
- managed sections in `AGENTS.md`

It prepares a repository so downstream execution can run from project-local artifacts instead of ad hoc prompts.

## Lifecycle Linkage

After a repository is bootstrapped:

- further bootstrap and upgrade work should go through [ai-meatbags/project-tracker-skill](https://github.com/ai-meatbags/project-tracker-skill)
- feature and task execution inside the bootstrapped repository should continue through `task-tracker`

This split matters. Mixing bootstrap governance with day-to-day execution in the target repo makes process drift much more likely.

## Source Of Truth

Canonical source of truth lives in:

- `.agent/skills/project-tracker` inside the `meatbags` repository

Publishing flow:

1. Update `.agent/skills/project-tracker`
2. Sync the same contents to this standalone repository

## Repository Layout

- `SKILL.md` — skill contract and operating rules
- `scripts/bootstrap_project.js` — deterministic materialization helper
- `references/` — seeds and templates copied into target repositories

## Usage

From the standalone repository root:

```bash
node scripts/bootstrap_project.js \
  --task-prefix PROJECT \
  --task-sync-mode local+linear \
  --project-root /path/to/project
```

Apply writes explicitly:

```bash
node scripts/bootstrap_project.js \
  --task-prefix PROJECT \
  --task-sync-mode local+linear \
  --project-root /path/to/project \
  --apply
```
