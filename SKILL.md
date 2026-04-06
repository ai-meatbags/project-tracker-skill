---
name: project-tracker
description: >-
  Bootstrap project process files when user asks "new project", "новый проект",
  "инициализируй проект", "project bootstrap", "bootstrap project", "го проект",
  "бахни проект", "upgrade project", or "апгрейд проекта". Creates missing
  process artifacts for new/current repos and runs explicit project upgrades so
  task-tracker can work from project-owned artifacts. Also owns cross-repository
  rollout of project-level process/template changes.
---

# Project Tracker

## Purpose

Prepare a repository so downstream execution skills work from one process canon:
- `rep.config.json`
- `tasks/_policies/arch-patterns.md`
- `tasks/_policies/dev-plan.md`
- `tasks/_policies/project-patterns.md`
- `tasks/_inbox/retro-inbox.md`
- `tasks/_templates/*`

This skill does not create feature dossiers or tasks. It prepares and upgrades project-level process artifacts.

## Triggers

Use this skill when user says:
- `new project`
- `новый проект`
- `инициализируй проект`
- `project bootstrap`
- `bootstrap project`
- `upgrade project`
- `апгрейд проекта`
- `project tracker`
- `project-tracker`
- `го проект`
- `бахни проект`

## Inputs

- Current working directory is the target project root unless the user explicitly names another directory or `--project-root` is passed.
- `task_prefix` from the user for bootstrap.
- `task_sync.mode` from the user for bootstrap:
  - `local`
  - `local+linear`

Path resolution contract:
- keep `skills root`, `git root`, and `target project root` as separate concepts;
- `target project root` is selected in this order:
  - an explicit path or folder named by the user;
  - otherwise the current working directory where the user asked to run bootstrap;
- do not silently replace `target project root` with git root just because the repo is a monorepo;
- use git root only as helper context for locating shared repo assets such as `.agent/skills`, never as permission to widen bootstrap scope.
- after `target project root` is resolved, read `rep.config.json` only from that root for any `project-tracker` or downstream `task-tracker` decision.

User-facing wording:
- ask in plain language where task queue/status should live;
- ask for task prefix in plain language;
- if `local+linear` is selected, mention Linear explicitly.

Internal rule:
- when `local+linear` is used, Linear team is derived from `task_prefix`.

## Behavior

The skill has two user-facing modes:
- `bootstrap project` for a repo where `rep.config.json` does not exist yet;
- `upgrade project` for an existing repo that must be brought to the current flow contract.

Monorepo rule:
- when the user is inside a subproject or names a subproject directory, bootstrap/upgrade scope is that subproject only;
- a parent repo or git root may already contain its own `rep.config.json` and still not change the answer for the selected subproject;
- bootstrap vs upgrade is decided only from `rep.config.json` inside the resolved `target project root`, not from parent folders.

Cross-repository rollout rule:
- if the user asks to port, roll out, or replicate project-level process/template changes across repositories or subprojects, this belongs to `project-tracker`, not `task-tracker`;
- read `references/architecture-traceability-rollout.md` when the rollout is specifically about the architecture traceability changes for dossier/templates and upgrade the relevant project roots from there.

## Responsibility split

`project-tracker` is a hybrid flow:
- the agent owns repository analysis, upgrade reasoning, preview, drift explanation, manual follow-up detection, and explicit confirmation flow;
- `scripts/bootstrap_project.js` is a deterministic materialization helper that copies or updates project-owned artifacts and does not own upgrade planning or decision-making;
- the script output is helper telemetry for the agent, not the source of truth for upgrade reasoning;
- if the agent finds a repo-specific inconsistency that cannot be handled safely by file materialization, it must surface it explicitly instead of teaching the script more reasoning.

### Bootstrap project

0. Resolve and restate the `target project root` before any bootstrap/upgrade decision.
1. Check whether `rep.config.json` already exists in the resolved `target project root`.
2. If it exists, stop bootstrap immediately and route the user to `upgrade project`.
3. Ask for task sync mode in plain language.
4. Ask for task prefix in plain language.
5. If `local+linear` is chosen, validate Linear readiness before apply.
6. Run bootstrap script in dry-run mode first against that same `target project root`.
7. Show only the artifacts that will be created.
8. Ask for explicit confirmation to apply.
9. Run with `--apply`.
10. Report final status as `created` or `unchanged`.

Bootstrap rules:
- the agent decides whether bootstrap is appropriate and explains the plan before writes;
- the script may create missing project-owned artifacts;
- it must not rewrite existing files;
- if `rep.config.json` already exists in the resolved `target project root`, do not use bootstrap; route the user to `upgrade project`;
- if parent folders or git root contain `rep.config.json` but the resolved `target project root` does not, stay in bootstrap mode for the target project;
- preview must explicitly print the resolved `target project root` so the user can catch wrong scope before writes.

### Upgrade project

The user runs one command and does not choose between “add missing” and “upgrade existing files”.

Upgrade flow:
0. Resolve and restate the `target project root` before reading any project config.
1. Read current project state first from that resolved root:
   - `rep.config.json`
   - `AGENTS.md`
   - `tasks/_policies/*`
   - `tasks/_templates/*`
   - `tasks/_inbox/retro-inbox.md`
2. Classify every canonical artifact into:
   - `create_missing`
   - `update_managed`
   - `unchanged`
   - `manual_followup`
3. Build one ordered upgrade plan.
4. Show a preview before any writes:
   - target flow version
   - planned creates
   - planned updates
   - unchanged managed artifacts
   - manual follow-ups with blocking flag and owner
5. Wait for explicit confirmation.
6. Apply ordered changes:
   - use the script only for deterministic file materialization/apply work;
   - perform any repo-specific manual steps outside the script, under explicit agent control;
   - treat `AGENTS.md` upgrade as agent-owned section merge work unless the project later introduces a dedicated safe merge helper;
   - write or update the canonical upgrade report from the agent/skill layer after analysis and apply results are known.
7. If apply fails, stop immediately, write `interrupted` to the upgrade report, and surface what was applied vs pending with the blocking reason.

Important:
- artifact classification, ordered planning, and manual follow-up decisions are agent responsibilities;
- the script is not required to emit bucketed upgrade plans, `manual_followup` objects, or the canonical upgrade report;
- when the repo is already up to date, the agent may conclude the upgrade as a no-op without inventing file writes for the sake of ceremony.

Managed file rules:
- `rep.config.json`: semantic merge of known process keys only; preserve unknown user keys; invalid JSON or ambiguous schema mismatch => `manual_followup`
- `AGENTS.md`: update only explicitly managed sections/blocks from the current template; preserve non-managed sections
  - managed section unit = top-level section from `references/agents.template.md`
  - if a managed section already exists with a clear matching heading, update that section in place
  - if a managed section from the template is missing in project `AGENTS.md` and insertion is unambiguous, append/add that missing section from the template instead of escalating immediately
  - only escalate to `manual_followup` when section boundaries are ambiguous, duplicate/conflicting headings prevent safe merge, or the target file structure makes insertion unsafe
- `tasks/_policies/dev-plan.md`: replace with the current upstream reference during upgrade
- `tasks/_policies/arch-patterns.md`: replace with the current upstream reference during upgrade
- `tasks/_policies/project-patterns.md`: never update in place; create if missing, otherwise preserve existing content
- `tasks/_templates/*`: replace with the current upstream reference during upgrade
- `tasks/_inbox/retro-inbox.md`: create if missing; never rewrite existing inbox content

Upgrade report:
- canonical path: `tasks/_inbox/upgrades/<run>.md`
- owner: agent/skill layer; not `scripts/bootstrap_project.js`
- purpose: leave a repo-local audit trail for the reasoning and outcome of the upgrade, even when the script only performs deterministic file materialization
- must record:
  - target flow version
  - current repo/project state summary
  - artifact classification by bucket
  - planned changes
  - applied changes
  - pending changes if interrupted
  - `manual_followup` items with file, reason, required action, blocking flag, and owner
  - final outcome: `completed`, `completed_with_followups`, or `interrupted`
- implementation rule:
  - the agent may write the report directly or via a separate dedicated helper script if the project introduces one later;
  - the main bootstrap/apply script must not become the owner of upgrade reasoning just to produce this report.

Completion rules:
- `completed` only when no blocking `manual_followup` items remain
- `completed_with_followups` only when remaining `manual_followup` items are explicitly non-blocking
- `interrupted` means apply stopped before the planned file materialization finished
- every upgrade run must leave its outcome in the canonical upgrade report; the agent response is a summary, not a substitute for the repo-local artifact

## Script

- File: `scripts/bootstrap_project.js`
- References:
  - `references/rep.config.seed.json`
  - `references/dev-plan.seed.md`
  - `references/arch-patterns.seed.md`
  - `references/project-patterns.template.md`
  - `references/retro-inbox.template.md`
  - `references/agents.template.md`

## Usage

```bash
# Dry-run
node .agent/skills/project-tracker/scripts/bootstrap_project.js \
  --task-prefix PROJECT \
  --task-sync-mode local+linear \
  --project-root /path/to/project

# Apply
node .agent/skills/project-tracker/scripts/bootstrap_project.js \
  --task-prefix PROJECT \
  --task-sync-mode local+linear \
  --project-root /path/to/project \
  --apply
```

If `--project-root` is omitted, script uses current directory.

Script contract:
- read the local references/seeds and the target repo state;
- materialize or update canonical project-owned artifacts deterministically;
- print enough stdout for the agent to understand what changed;
- on upgrade, do not replace existing `AGENTS.md`; `AGENTS.md` section merge remains agent-owned unless a dedicated safe helper is introduced;
- do not implement repo-specific upgrade planning, bucket classification, owner assignment, or manual-followup reasoning.

## Bootstrap contract

Bootstrap must ensure:
- `rep.config.json` exists and contains the new flow schema;
- project policies exist under `tasks/_policies`;
- `tasks/_inbox/retro-inbox.md` exists;
- runtime templates exist under `tasks/_templates`;
- `AGENTS.md` contains the managed routing/source-of-truth sections from the template.

Bootstrap must copy project-owned runtime templates into the project so `task-tracker` works only from project-local artifacts and templates.

## Linear preflight

For `local+linear`:
1. Resolve `task_prefix`.
2. Verify Linear queue/workflow is reachable for that team.
3. Fail fast if MCP or queue readiness is missing.
4. This preflight is performed by the agent before invoking bootstrap apply or any upgrade writes.

## Handoff

After bootstrap or upgrade, route the user to `task-tracker`:
- `task tracker help`
- `новая задача / new task`
- `сделай задачу N`

## Reference files

- `references/architecture-traceability-rollout.md`
  Read when the user asks to port or roll out the architecture traceability changes to another repository or subproject.
