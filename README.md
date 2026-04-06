# Project Tracker

Skill and helper script for bootstrapping and upgrading project process files in a repository.

## Зачем нужен

Этот репозиторий нужен, чтобы:

- быстро подготовить новый репозиторий к работе
- обновить уже существующий репозиторий до актуального process contract
- раскатить изменения шаблонов и project-level правил между репозиториями

`project-tracker` не ведет повседневную разработку задач. Его зона ответственности:

- bootstrap проекта
- upgrade project-level артефактов
- rollout изменений в process/templates

После bootstrap повседневная работа идет через [task-tracker-skill](https://github.com/ai-meatbags/task-tracker-skill).

## Что умеет

При bootstrap создает или подготавливает:

- `rep.config.json`
- `tasks/_policies/arch-patterns.md`
- `tasks/_policies/dev-plan.md`
- `tasks/_policies/project-patterns.md`
- `tasks/_inbox/retro-inbox.md`
- `tasks/_templates/*`
- managed sections в `AGENTS.md`

При upgrade:

- читает текущее состояние репозитория
- определяет, что создать, что обновить, а что оставить как есть
- обновляет только managed project-level артефакты
- не подменяет repo-specific логику "разумными" fallback-ами

## Основные команды

Триггеры для агента:

- `bootstrap project`
- `upgrade project`
- `project tracker`
- `project-tracker`
- `новый проект`
- `инициализируй проект`
- `апгрейд проекта`

CLI helper:

```bash
node scripts/bootstrap_project.js --help
```

Поддерживаемые параметры:

- `--task-prefix PROJECT`
- `--task-sync-mode local|local+linear`
- `--project-root /path/to/project`
- `--apply`

Dry run:

```bash
node scripts/bootstrap_project.js \
  --task-prefix PROJECT \
  --task-sync-mode local+linear \
  --project-root /path/to/project
```

Apply:

```bash
node scripts/bootstrap_project.js \
  --task-prefix PROJECT \
  --task-sync-mode local+linear \
  --project-root /path/to/project \
  --apply
```

Если `--project-root` не указан, используется текущая директория.

## Структура репозитория

- `SKILL.md` — правила и контракт skill
- `scripts/bootstrap_project.js` — deterministic helper для materialization файлов
- `references/` — seed/template файлы для bootstrap и upgrade
