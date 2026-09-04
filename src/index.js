#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { selectTopic, recordUsage } from './selectTopic.js';
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

function resolveConfigPath(envVar, defaultRelative) {
  const target = process.env[envVar] ?? defaultRelative;
  return path.isAbsolute(target) ? target : path.resolve(PACKAGE_ROOT, target);
}

const KNOWLEDGE_BASE_PATH = resolveConfigPath('KNOWLEDGE_BASE_PATH', '../../marketing/knowledge-base.json');
const POST_HISTORY_PATH = resolveConfigPath('POST_HISTORY_PATH', '../../marketing/post-history.json');
const OUTPUT_DIR = resolveConfigPath('OUTPUT_DIR', './output');

async function loadKnowledgeBase() {
  try {
    return JSON.parse(await readFile(KNOWLEDGE_BASE_PATH, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        `Knowledge base not found at ${KNOWLEDGE_BASE_PATH}. Run Prompt 1 ` +
          `(docs/prompt-1-claude-cli-knowledge-base.md) first, or set KNOWLEDGE_BASE_PATH in .env.`,
      );
    }
    throw err;
  }
}

async function loadHistory() {
  try {
    return JSON.parse(await readFile(POST_HISTORY_PATH, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`[aquaroster-social-daily] No post-history.json found at ${POST_HISTORY_PATH} — starting fresh (cycle 1).`);
      return { posts: [], cycle_number: 1 };
    }
    throw err;
  }
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function runGenerate({ dryRun }) {
  const knowledgeBase = await loadKnowledgeBase();
  const history = await loadHistory();

  const topic = selectTopic(knowledgeBase, history);
  const priorUsedCount = (history.posts ?? []).filter((p) => p.topic_id === topic.id).length;
  console.log(
    `[aquaroster-social-daily] Selected topic "${topic.id}" ` +
      `(status=${topic.status}, prior used_count=${priorUsedCount}, cycle=${history.cycle_number ?? 1})`,
  );

  const prompt = buildOllamaPrompt({ topic, knowledgeBase, history });
  const shared = await callOllama(prompt);

  const drafts = {
    x: formatX(shared),
    linkedin: formatLinkedin(shared),
    instagram: formatInstagram(shared),
    reddit: formatReddit(shared),
  };

  const date = todayString();
  const socialText = renderSocialText({ topic, date, drafts });
  const imagePromptText = renderImagePrompt({ topic, date, imagePrompt: shared.image_prompt });

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
  await writeFile(POST_HISTORY_PATH, JSON.stringify(updatedHistory, null, 2));

  console.log(`[aquaroster-social-daily] Wrote drafts to ${runDir}`);
  console.log(`[aquaroster-social-daily] Updated ${POST_HISTORY_PATH} (cycle_number=${updatedHistory.cycle_number})`);
}

const program = new Command();
program.name('aquaroster-social-daily').description('Generate daily AquaRoster social drafts from a local Ollama model');

program
  .command('generate')
  .description('Run the full pipeline once: select topic -> Ollama -> platform drafts')
  .option('--dry-run', 'Print formatted drafts to console without writing files or updating history', false)
  .action(async (opts) => {
    try {
      await runGenerate({ dryRun: opts.dryRun });
    } catch (err) {
      console.error(`[aquaroster-social-daily] ${err.message}`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
