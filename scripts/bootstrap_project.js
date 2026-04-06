#!/usr/bin/env node

const fsp = require('fs/promises');
const path = require('path');

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = {
    apply: false,
    taskPrefix: '',
    taskSyncMode: '',
    projectRoot: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply') {
      out.apply = true;
      continue;
    }
    if (arg === '--task-prefix') {
      out.taskPrefix = (args[i + 1] || '').trim();
      i++;
      continue;
    }
    if (arg === '--project-root') {
      const raw = (args[i + 1] || '').trim();
      out.projectRoot = raw ? path.resolve(raw) : out.projectRoot;
      i++;
      continue;
    }
    if (arg === '--task-sync-mode') {
      out.taskSyncMode = (args[i + 1] || '').trim();
      i++;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return out;
}

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = out[key];
    if (isObject(sourceVal) && isObject(targetVal)) {
      out[key] = deepMerge(targetVal, sourceVal);
      continue;
    }
    if (Array.isArray(sourceVal)) {
      out[key] = sourceVal.slice();
      continue;
    }
    out[key] = sourceVal;
  }
  return out;
}

function normalizeTaskPrefix(raw) {
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned) return '';
  if (!/^[A-Z][A-Z0-9_-]*$/.test(cleaned)) {
    throw new Error('task_prefix must match ^[A-Z][A-Z0-9_-]*$');
  }
  return cleaned;
}

function normalizeTaskSyncMode(raw) {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return '';
  if (cleaned === 'linear') {
    return 'local+linear';
  }
  if (!['local', 'local+linear'].includes(cleaned)) {
    throw new Error('task_sync.mode must be one of: local, local+linear');
  }
  return cleaned;
}

function renderRepConfigSeed(seedJson, taskPrefix) {
  return seedJson.replace(/__TASK_PREFIX__/g, taskPrefix);
}

function applyTaskPrefixToDevPlan(content, taskPrefix) {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized
    .replace(/\bTEAMCAL\b/g, taskPrefix)
    .replace(/\{task_prefix\}/g, taskPrefix);
}

async function readTextIfExists(filePath) {
  try {
    return await fsp.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function ensureDir(dirPath, apply) {
  if (!apply) return;
  await fsp.mkdir(dirPath, { recursive: true });
}

function buildResult(status, filePath, note) {
  return { status, file: filePath, note };
}

async function writeWithPolicy(filePath, content, apply, policy) {
  const prev = await readTextIfExists(filePath);

  if (!['replace', 'create_missing'].includes(policy)) {
    throw new Error(`Unknown write policy: ${policy}`);
  }

  if (prev === null) {
    if (apply) {
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      await fsp.writeFile(filePath, content, 'utf8');
    }
    return buildResult('created', filePath, apply ? 'written' : 'dry-run');
  }

  if (prev === content) {
    return buildResult('unchanged', filePath, 'no diff');
  }

  if (policy === 'create_missing') {
    return buildResult('unchanged', filePath, 'existing preserved');
  }

  if (apply) {
    await fsp.writeFile(filePath, content, 'utf8');
  }
  return buildResult('updated', filePath, apply ? 'replaced' : 'would replace');
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(
      [
        'Usage:',
        '  node skills/project-tracker/scripts/bootstrap_project.js --task-prefix PROJECT [--task-sync-mode local|local+linear] [--project-root /path/to/project] [--apply]',
        '',
        'Default mode is dry-run. Add --apply to write files.',
      ].join('\n')
    );
    return;
  }

  const projectRoot = path.resolve(args.projectRoot);
  const referencesDir = path.resolve(__dirname, '..', 'references');

  const archSeedPath = path.join(referencesDir, 'arch-patterns.seed.md');
  const devPlanSeedPath = path.join(referencesDir, 'dev-plan.seed.md');
  const projectPatternsSeedPath = path.join(referencesDir, 'project-patterns.template.md');
  const repConfigSeedPath = path.join(referencesDir, 'rep.config.seed.json');
  const agentsSeedPath = path.join(referencesDir, 'agents.template.md');
  const retroInboxSeedPath = path.join(referencesDir, 'retro-inbox.template.md');
  const featureTemplatePath = path.join(referencesDir, 'feature.template.md');
  const featureStateTemplatePath = path.join(referencesDir, 'feature-state.template.json');
  const taskStateTemplatePath = path.join(referencesDir, 'task-state.template.json');
  const taskTestingTemplatePath = path.join(referencesDir, 'task-testing.template.md');
  const taskRetroTemplatePath = path.join(referencesDir, 'task-retro.template.md');
  const featureRetroTemplatePath = path.join(referencesDir, 'feature-retro.template.md');

  const archSeed = await fsp.readFile(archSeedPath, 'utf8');
  const devPlanSeedRaw = await fsp.readFile(devPlanSeedPath, 'utf8');
  let projectPatternsSeed = await fsp.readFile(projectPatternsSeedPath, 'utf8');
  const repConfigSeedRaw = await fsp.readFile(repConfigSeedPath, 'utf8');
  const agentsSeed = await fsp.readFile(agentsSeedPath, 'utf8');
  let retroInboxSeed = await fsp.readFile(retroInboxSeedPath, 'utf8');
  const featureTemplate = await fsp.readFile(featureTemplatePath, 'utf8');
  const featureStateTemplate = await fsp.readFile(featureStateTemplatePath, 'utf8');
  const taskStateTemplate = await fsp.readFile(taskStateTemplatePath, 'utf8');
  const taskTestingTemplate = await fsp.readFile(taskTestingTemplatePath, 'utf8');
  const taskRetroTemplate = await fsp.readFile(taskRetroTemplatePath, 'utf8');
  const featureRetroTemplate = await fsp.readFile(featureRetroTemplatePath, 'utf8');
  projectPatternsSeed = projectPatternsSeed.replace('YYYY-MM-DD', today());
  retroInboxSeed = retroInboxSeed.replace('YYYY-MM-DD', today());
  const repConfigPath = path.join(projectRoot, 'rep.config.json');

  const existingRepRaw = await readTextIfExists(repConfigPath);
  const isUpgrade = existingRepRaw !== null;
  let existingRep = {};
  if (existingRepRaw) {
    try {
      existingRep = JSON.parse(existingRepRaw);
    } catch (err) {
      throw new Error(`Invalid JSON in rep.config.json: ${err.message}`);
    }
  }

  const prefixFromConfig = typeof existingRep.task_prefix === 'string' ? existingRep.task_prefix : '';
  const taskPrefix = normalizeTaskPrefix(args.taskPrefix || prefixFromConfig || 'DEV');
  const syncModeFromConfig = isObject(existingRep.task_sync) && typeof existingRep.task_sync.mode === 'string'
    ? existingRep.task_sync.mode
    : '';
  const taskSyncMode = normalizeTaskSyncMode(args.taskSyncMode || syncModeFromConfig || 'local+linear');
  const devPlanSeed = applyTaskPrefixToDevPlan(devPlanSeedRaw, taskPrefix);

  let requiredConfig = {};
  try {
    requiredConfig = JSON.parse(renderRepConfigSeed(repConfigSeedRaw, taskPrefix));
  } catch (err) {
    throw new Error(`Invalid JSON in rep.config.seed.json: ${err.message}`);
  }
  requiredConfig.task_prefix = taskPrefix;
  const nextRepConfig = deepMerge(existingRep, requiredConfig);
  nextRepConfig.task_prefix = taskPrefix;
  nextRepConfig.task_sync = isObject(nextRepConfig.task_sync) ? nextRepConfig.task_sync : {};
  nextRepConfig.task_sync.mode = taskSyncMode;

  if (isObject(nextRepConfig.instructions)) {
    delete nextRepConfig.instructions.system_prompt_source;
    delete nextRepConfig.instructions.system_prompt;
    if (Object.keys(nextRepConfig.instructions).length === 0) {
      delete nextRepConfig.instructions;
    }
  }

  const results = [];
  const policiesDir = path.join(projectRoot, nextRepConfig.paths.policies_dir || 'tasks/_policies');
  const inboxDir = path.join(projectRoot, nextRepConfig.paths.inbox_dir || 'tasks/_inbox');
  const templatesDir = path.join(projectRoot, nextRepConfig.paths.templates_dir || 'tasks/_templates');
  const archOutPath = path.join(projectRoot, nextRepConfig.paths.arch_file || 'tasks/_policies/arch-patterns.md');
  const devPlanOutPath = path.join(projectRoot, nextRepConfig.paths.dev_plan_file || 'tasks/_policies/dev-plan.md');
  const projectPatternsOutPath = path.join(
    projectRoot,
    nextRepConfig.paths.project_patterns_file || 'tasks/_policies/project-patterns.md'
  );
  const retroInboxOutPath = path.join(
    projectRoot,
    nextRepConfig.paths.retro_inbox_file || 'tasks/_inbox/retro-inbox.md'
  );
  const featureTemplateOutPath = path.join(
    projectRoot,
    nextRepConfig.paths.feature_template_file || 'tasks/_templates/feature.template.md'
  );
  const featureStateTemplateOutPath = path.join(
    projectRoot,
    nextRepConfig.paths.feature_state_template_file || 'tasks/_templates/feature-state.template.json'
  );
  const taskStateTemplateOutPath = path.join(
    projectRoot,
    nextRepConfig.paths.task_state_template_file || 'tasks/_templates/task-state.template.json'
  );
  const taskTestingTemplateOutPath = path.join(
    projectRoot,
    nextRepConfig.paths.task_testing_template_file || 'tasks/_templates/task-testing.template.md'
  );
  const taskRetroTemplateOutPath = path.join(
    projectRoot,
    nextRepConfig.paths.task_retro_template_file || 'tasks/_templates/task-retro.template.md'
  );
  const featureRetroTemplateOutPath = path.join(
    projectRoot,
    nextRepConfig.paths.feature_retro_template_file || 'tasks/_templates/feature-retro.template.md'
  );
  const agentsOutPath = path.join(projectRoot, 'AGENTS.md');
  const replacePolicy = 'replace';
  const preserveExistingPolicy = 'create_missing';

  await ensureDir(policiesDir, args.apply);
  await ensureDir(inboxDir, args.apply);
  await ensureDir(templatesDir, args.apply);

  results.push(
    await writeWithPolicy(repConfigPath, `${JSON.stringify(nextRepConfig, null, 2)}\n`, args.apply, isUpgrade ? replacePolicy : preserveExistingPolicy)
  );

  results.push(await writeWithPolicy(
    archOutPath,
    archSeed.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'),
    args.apply,
    isUpgrade ? replacePolicy : preserveExistingPolicy
  ));

  results.push(await writeWithPolicy(
    devPlanOutPath,
    devPlanSeed.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'),
    args.apply,
    isUpgrade ? replacePolicy : preserveExistingPolicy
  ));

  results.push(await writeWithPolicy(
    projectPatternsOutPath,
    projectPatternsSeed.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'),
    args.apply,
    preserveExistingPolicy
  ));

  results.push(await writeWithPolicy(
    retroInboxOutPath,
    retroInboxSeed.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'),
    args.apply,
    preserveExistingPolicy
  ));

  results.push(await writeWithPolicy(featureTemplateOutPath, featureTemplate.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'), args.apply, isUpgrade ? replacePolicy : preserveExistingPolicy));
  results.push(await writeWithPolicy(featureStateTemplateOutPath, featureStateTemplate.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'), args.apply, isUpgrade ? replacePolicy : preserveExistingPolicy));
  results.push(await writeWithPolicy(taskStateTemplateOutPath, taskStateTemplate.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'), args.apply, isUpgrade ? replacePolicy : preserveExistingPolicy));
  results.push(await writeWithPolicy(taskTestingTemplateOutPath, taskTestingTemplate.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'), args.apply, isUpgrade ? replacePolicy : preserveExistingPolicy));
  results.push(await writeWithPolicy(taskRetroTemplateOutPath, taskRetroTemplate.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'), args.apply, isUpgrade ? replacePolicy : preserveExistingPolicy));
  results.push(await writeWithPolicy(featureRetroTemplateOutPath, featureRetroTemplate.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'), args.apply, isUpgrade ? replacePolicy : preserveExistingPolicy));
  results.push(await writeWithPolicy(
    agentsOutPath,
    agentsSeed.replace(/\r\n/g, '\n').replace(/\s*$/, '\n'),
    args.apply,
    preserveExistingPolicy
  ));

  const mode = args.apply ? 'apply' : 'dry-run';
  console.log(`Mode: ${mode}`);
  console.log(`Flow: ${isUpgrade ? 'upgrade' : 'bootstrap'}`);
  console.log(`Project root: ${projectRoot}`);
  console.log(`task_prefix: ${taskPrefix}`);
  console.log(`task_sync.mode: ${taskSyncMode}`);

  for (const item of results) {
    const rel = path.relative(projectRoot, item.file) || path.basename(item.file);
    console.log(`${item.status.padEnd(9)} ${rel} (${item.note})`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
