#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { selectTopic, recordUsage } from './selectTopic.js';
import { loadKnowledgeBase } from './loadKnowledgeBase.js';
import { buildOllamaPrompt } from './buildOllamaPrompt.js';
import { callOllama } from './callOllama.js';
import { formatX } from './platformFormatters/x.js';
import { formatLinkedin } from './platformFormatters/linkedin.js';
import { formatInstagram } from './platformFormatters/instagram.js';
import { formatReddit } from './platformFormatters/reddit.js';
import { renderSocialText } from './lib/renderSocialText.js';
import { renderImagePrompt } from './lib/renderImagePrompt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const LOG = '[social-daily]';

// Default vault location on the maintainer's machine. Override in .env —
// it's an absolute, machine-specific path, which is why it lives in the
// gitignored .env and not in source. See docs/business-context-reference.md.
const DEFAULT_VAULT_PATH = 'D:\\work\\RidgeHQAPP\\Brain\\RidgeHQAPP';

function resolveConfigPath(envVar, defaultRelative) {
  const target = process.env[envVar] ?? defaultRelative;
  return path.isAbsolute(target) ? target : path.resolve(PACKAGE_ROOT, target);
}

const BUSINESS_VAULT_PATH = resolveConfigPath('BUSINESS_VAULT_PATH', DEFAULT_VAULT_PATH);
const POST_HISTORY_PATH = resolveConfigPath('POST_HISTORY_PATH', './data/post-history.json');
const OUTPUT_DIR = resolveConfigPath('OUTPUT_DIR', './output');
const PRODUCT_NAME = process.env.PRODUCT_NAME?.trim() || 'AquaRoster';

async function loadHistory() {
  try {
    return JSON.parse(await readFile(POST_HISTORY_PATH, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`${LOG} No post-history.json found at ${POST_HISTORY_PATH} — starting fresh (cycle 1).`);
      return { posts: [], cycle_number: 1 };
    }
    throw err;
  }
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function runGenerate({ dryRun }) {
  const knowledgeBase = await loadKnowledgeBase(BUSINESS_VAULT_PATH);
  const byStatus = knowledgeBase.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `${LOG} Loaded ${knowledgeBase.length} topic chunks from vault ${BUSINESS_VAULT_PATH} ` +
      `(${Object.entries(byStatus).map(([s, n]) => `${n} ${s}`).join(', ')})`,
  );

  const history = await loadHistory();

  const topic = selectTopic(knowledgeBase, history);
  const priorUsedCount = (history.posts ?? []).filter((p) => p.topic_id === topic.id).length;
  console.log(
    `${LOG} Selected topic "${topic.id}" ` +
      `(status=${topic.status}, prior used_count=${priorUsedCount}, cycle=${history.cycle_number ?? 1})`,
  );

  const prompt = buildOllamaPrompt({ topic, knowledgeBase, history, productName: PRODUCT_NAME });
  const shared = await callOllama(prompt);

  const drafts = {
    x: formatX(shared),
    linkedin: formatLinkedin(shared),
    instagram: formatInstagram(shared),
    reddit: formatReddit(shared),
  };

  const date = todayString();
  const socialText = renderSocialText({ topic, date, drafts, productName: PRODUCT_NAME });
  const imagePromptText = renderImagePrompt({ topic, date, imagePrompt: shared.image_prompt, productName: PRODUCT_NAME });

  if (dryRun) {
    console.log('\n=== DRY RUN — nothing written, history unchanged ===\n');
    console.log(socialText);
    console.log(imagePromptText);
    return;
  }

  const runDir = path.join(OUTPUT_DIR, date);
  await mkdir(runDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(runDir, 'social-posts.txt'), socialText),
    writeFile(path.join(runDir, 'image-prompt.txt'), imagePromptText),
  ]);

  const updatedHistory = recordUsage({ knowledgeBase, history, topic, date });
  await mkdir(path.dirname(POST_HISTORY_PATH), { recursive: true });
  await writeFile(POST_HISTORY_PATH, JSON.stringify(updatedHistory, null, 2));

  console.log(`${LOG} Wrote drafts to ${runDir}`);
  console.log(`${LOG} Updated ${POST_HISTORY_PATH} (cycle_number=${updatedHistory.cycle_number})`);
}

const program = new Command();
program.name('social-daily').description('Generate daily social drafts from the RidgeHQ business vault via a local Ollama model');

program
  .command('generate')
  .description('Run the full pipeline once: load vault -> select topic -> Ollama -> platform drafts')
  .option('--dry-run', 'Print formatted drafts to console without writing files or updating history', false)
  .action(async (opts) => {
    try {
      await runGenerate({ dryRun: opts.dryRun });
    } catch (err) {
      console.error(`${LOG} ${err.message}`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
