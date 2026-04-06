# План разработки и трекинг прогресса

Дата: 2026-03-07

## Назначение
Этот файл — единая человеко-читаемая политика процесса.

Машинно-читаемые пути, naming, sync mode, статусы и mapping для `local+linear` берутся из `rep.config.json`.

## Политика обновления
- `tasks/_policies/arch-patterns.md` и `tasks/_policies/dev-plan.md` обновляются только upstream-деплоем.
- Локальные выводы и повторяемые правила записываются только в `tasks/_policies/project-patterns.md`.
- Локальные task/feature artifacts обновляются во время работы над задачами.

## Артефакты процесса

### Проектный уровень
- `rep.config.json`
- `tasks/_policies/arch-patterns.md`
- `tasks/_policies/dev-plan.md`
- `tasks/_policies/project-patterns.md`
- `tasks/_inbox/retro-inbox.md`
- `tasks/_templates/*`

### Feature-level
- `tasks/<feature-key>/<feature-key>.feature.md`
- `tasks/<feature-key>/<feature-key>.state.json`
- `tasks/<feature-key>/<feature-key>.retro.md`

### Task-level
- `tasks/.../{task_file}.md`
- `tasks/.../{task_file}.state.json`
- `tasks/.../{task_file}.testing.md`
- `tasks/.../{task_file}.retro.md`

### Runtime templates
- `tasks/_templates/feature.template.md`
- `tasks/_templates/feature-state.template.json`
- `tasks/_templates/task-state.template.json`
- `tasks/_templates/task-testing.template.md`
- `tasks/_templates/task-retro.template.md`
- `tasks/_templates/feature-retro.template.md`

## Двухслойная модель процесса

### Feature flow
- `context -> spec -> plan -> tasks -> implement -> feature_retro -> finish`

### Task flow
- `todo -> in_progress -> testing -> need_changes -> need_retro -> done`

Специальный статус:
- `blocked`

Терминальный результат хранится отдельно как `resolution`:
- `completed`
- `cancelled`
- `superseded`
- `duplicate`

## Ранний артефакт и fast lane
- Любая новая работа начинается с feature dossier.
- `Context`, `Spec` и `Plan` — отдельные логические стадии, но живут в одном файле.
- Для tiny change допускается fast lane:
  - `feature dossier -> todo -> in_progress -> testing -> need_retro -> done`
  - без feature anchor issue
  - без отдельного `FEATURE.retro.md`
  - без `FEATURE.state.json`, пока работа остаётся tiny/simple
  - `TASK.testing.md` создаётся только при входе в `testing`
  - `TASK.retro.md` создаётся только при входе в `need_retro`

## Gate simple vs feature

### Simple path допустим только если одновременно верно:
- нет внешнего или публичного контрактного изменения;
- нет миграции или backfill;
- нет изменения auth/security boundary;
- нет новой внешней интеграции или async semantics;
- изменение локально и идёт в одном небольшом участке кода;
- риск конфликтов по файлам низкий.

### Feature path обязателен, если верно хотя бы одно:
- меняется контракт;
- есть migration/backfill;
- меняются 2+ подсистемы;
- меняется auth/security boundary;
- добавляется внешняя интеграция или async semantics;
- нужна multi-agent реализация;
- средний или высокий риск конфликтов по shared files.

## Authority rules

### `FEATURE.state.json`
Нужен для feature path и другой нетривиальной работы.

Для tiny/simple path может не создаваться, пока работа не переведена в полноценную feature path.

- authoritative для feature stage;
- authoritative для feature anchor linkage;
- authoritative для required task set;

Порядок обновления:
1. обновить `FEATURE.state.json`
2. обновить feature dossier
3. синкнуть feature anchor issue, если включён `local+linear`

### `TASK.state.json`
- authoritative для `status`;
- authoritative для `next_gate`;
- authoritative для blockers;
- authoritative для active owner;
- authoritative для `artifact_paths`.

Порядок обновления:
1. обновить `TASK.state.json`
2. обновить stage-specific artifact, если он нужен (`TASK.testing.md` или `TASK.retro.md`)
3. обновить task file
4. синкнуть Linear последним, если включён `local+linear`

### Правило derivation для sibling artifacts
- канонический путь задачи — это `TASK.md`
- sibling artifacts всегда строятся от него через suffixes из `rep.config.json`
- правило:
  1. взять canonical task file path
  2. убрать `.md`
  3. добавить нужный suffix
- примеры:
  - `PREFIX-12.some-task.md`
  - `PREFIX-12.some-task.state.json`
  - `PREFIX-12.some-task.testing.md`
  - `PREFIX-12.some-task.retro.md`
- если пути в `TASK.state.json` расходятся с этим правилом, агент должен пересчитать их и переписать `TASK.state.json`

## Testing gate
- `testing` завершает только в `need_changes` или `need_retro`.
- Прямой переход `testing -> done` запрещён.
- `TASK.testing.md` обязателен всегда.
- Уровень проверки зависит от risk tier:
  - `low`: self-review обязателен, reviewer optional
  - `medium`: self-review + reviewer review обязательны
  - `high`: self-review + reviewer review обязательны, плюс residual risks и containment/rollback notes если релевантно

### Источник testing commands
Порядок поиска команд:
1. task/feature-specific checks из feature dossier или task definition
2. defaults из `rep.config.json`
3. repo conventions из `project-patterns.md`

Если явных checks нет:
- допускаются только repo-native команды, найденные по месту;
- это решение фиксируется в `TASK.testing.md`.

## Retro gate

### Task retro
- обязателен для каждой задачи до `done`
- переход: `testing -> need_retro -> done`
- закрытие задачи допустимо только если:
  - создан `TASK.retro.md`
  - actionable proposals добавлены в `tasks/_inbox/retro-inbox.md`
- отдельный пользовательский триггер для retro не нужен: агент выполняет retro как часть close-out после `testing`

### Feature retro
- обязателен для каждой нетривиальной feature
- не блокирует delivery
- feature может перейти в `finish`, если:
  - все required tasks закрыты
  - leftover work либо вынесен в explicit follow-ups, либо отмечен как out of scope / cancelled / superseded
  - feature dossier фиксирует, что вошло, что не вошло, какие follow-ups остались и кто ими владеет
  - существует `FEATURE.retro.md`

## Resume after interruption

### Resume order for active task
1. `TASK.state.json`
2. task file
3. feature dossier
4. `TASK.testing.md`
5. `TASK.retro.md`

Правило:
- локальные артефакты всегда главнее чата;
- Linear никогда не переопределяет локальные артефакты.

### Команды resume
- `текущая задача / current task`
- `продолжай задачу / continue task`

Если активных задач несколько:
- автоматически продолжать можно только если активная задача одна;
- иначе нужно показать кандидатов и ждать явного выбора.

## Multi-agent protocol
- multi-agent возможен только при стабильных `Spec` и `Plan`
- write ownership обязателен
- integration owner обязателен
- shared contract changes принимает только integration owner
- координация multi-agent работы фиксируется в feature dossier (`Plan` / `Tracking`) и `TASK.state.json`, без отдельных worker packet artifacts
- при contract change:
  - worker останавливается на safe checkpoint
  - issue фиксируется в task state и task log
  - integration owner обновляет feature dossier
  - integration owner обновляет затронутые task states до возобновления работы

## Sync modes

### `local`
- локальные артефакты — единственный source of truth
- sync в Linear не нужен

### `local+linear`
- локальные артефакты — execution truth
- Linear — queue/status mirror
- локальный статус остаётся каноническим
- если в Linear нет точного статуса, используется ближайший по смыслу, но локальный статус не меняется

### Язык task-артефактов и Linear
- Названия и описания локальных feature/task артефактов по умолчанию пишутся на русском языке.
- Названия и описания Linear issue, которые создаёт или обновляет процесс, тоже по умолчанию пишутся на русском языке.
- Английский допустим только если пользователь явно попросил английский или если внутри текста нужен фиксированный внешний идентификатор/термин.

### Обязательный sync в Linear
Синкать на:
- создание task
- `in_progress`
- `blocked`
- `need_changes`
- выход из `testing`
- `need_retro`
- `done`

В Linear нужно писать ссылки, удобные для открытия человеком:
- использовать Markdown-ссылки на GitHub `blob` URL, а не локальные пути;
- агент обязан пытаться собрать GitHub-ссылку автоматически из локального git-контекста: remote -> GitHub web base -> текущий ref -> repo-relative path -> blob URL;
- отсутствие опубликованной ветки само по себе не является причиной останавливать sync;
- спрашивать пользователя нужно только если не удаётся найти или надёжно определить remote репозитория.

Это правило действует и для body issue, и для комментариев.

В body issue и в комментарии Linear должны попадать GitHub-ссылки на:
- feature dossier
- task artifact
- `TASK.testing.md`
- `TASK.retro.md`
- retro inbox item, если есть actionable proposal

### Feature-level sync milestones
Для non-trivial feature синк идёт в feature anchor issue:
- выбран feature path
- `Spec` frozen
- `Plan` frozen
- task set generated
- feature retro ready
- feature finished

## Правила required task set
- canonical required task set живёт в feature dossier и `FEATURE.state.json`
- задачи вне required set не блокируют finish, пока их явно не подняли в required set
- до старта implementation required set меняет feature owner
- после старта multi-task execution required set меняет только feature owner или integration owner

## Правило blocked
Переводить задачу в `blocked` только если:
- ждём внешнее решение;
- есть незакрытая внешняя зависимость;
- инфраструктура или интеграция реально блокирует движение;
- нужна product/contract clarification, которую исполнитель сам снять не может.

Не использовать `blocked`, если:
- есть замечания по ревью;
- нужно доделать код;
- нужно ещё подумать.

## Правило логирования
Формат:
`YYYY-MM-DD HH:MM — [status] короткий факт или решение`

Лог дописывается только в конец.

## Если в ходе работы найдено новое правило
1. Если правило локально полезно проекту — добавить в `tasks/_policies/project-patterns.md`.
2. Если правило выглядит reusable для нескольких проектов — отправить в retro inbox как `кандидат в upstream / upstream candidate`.
3. `arch-patterns` и `dev-plan` локально не редактировать в ходе обычной работы.
