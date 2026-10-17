#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { selectTopic, recordUsage } from './selectTopic.js';
import { loadKnowledgeBase } from './loadKnowledgeBase.js';
import { selectFocus } from './seoFocus.js';
import { selectProductHuntFormat, productHuntCooldown } from './productHunt.js';
import { buildOllamaPrompt } from './buildOllamaPrompt.js';
import { buildArticlePrompt } from './buildArticlePrompt.js';
import { buildVideoScriptPrompt } from './buildVideoScriptPrompt.js';
import { buildProductHuntPrompt } from './buildProductHuntPrompt.js';
import { callOllama, callOllamaArticle, callOllamaVideoScript, callOllamaProductHunt } from './callOllama.js';
import { formatX } from './platformFormatters/x.js';
import { formatLinkedin } from './platformFormatters/linkedin.js';
import { formatInstagram } from './platformFormatters/instagram.js';
import { formatReddit } from './platformFormatters/reddit.js';
import { renderSocialText } from './lib/renderSocialText.js';
import { renderImagePrompt } from './lib/renderImagePrompt.js';
import { renderVideoScript } from './lib/renderVideoScript.js';
import { renderBlogPost } from './lib/renderBlogPost.js';
import { renderLinkedInArticle } from './lib/renderLinkedInArticle.js';
import { renderProductHuntPost } from './lib/renderProductHuntPost.js';
import { videoMeta } from './lib/videoMeta.js';

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
const BLOG_BASE_URL = process.env.BLOG_BASE_URL?.trim() || 'https://www.ridgehq.app/blog';
const PRODUCTHUNT_COOLDOWN_DAYS = Number(process.env.PRODUCTHUNT_COOLDOWN_DAYS) || 2;

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

async function runGenerate({ dryRun, longForm, productHunt }) {
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

  const focus = selectFocus(history);
  console.log(
    `${LOG} Website focus: ${focus.vertical.id} (${focus.vertical.url}) + platform ${focus.platform.id}`,
  );

  const prompt = buildOllamaPrompt({ topic, knowledgeBase, history, focus, productName: PRODUCT_NAME });
  const shared = await callOllama(prompt);

  const drafts = {
    x: formatX(shared, focus),
    linkedin: formatLinkedin(shared, focus),
    instagram: formatInstagram(shared, focus),
    reddit: formatReddit(shared),
  };

  const date = todayString();
  const socialText = renderSocialText({ topic, date, drafts, productName: PRODUCT_NAME, focus });
  const imagePromptText = renderImagePrompt({ topic, date, imagePrompt: shared.image_prompt, productName: PRODUCT_NAME });

  // 1-minute video script: one more Ollama pass, built from the same shared
  // object (headline + image prompt + hook/core message/CTA).
  const video = videoMeta({ topic, shared });
  console.log(`${LOG} Video: generating 1-minute script for "${topic.id}"...`);
  const script = await callOllamaVideoScript(buildVideoScriptPrompt({ topic, shared, video, productName: PRODUCT_NAME }));
  const videoScriptText = renderVideoScript({ topic, date, video, script, productName: PRODUCT_NAME });

  // Long-form: one extra Ollama pass on the SAME topic -> a website blog
  // post + a LinkedIn article (separate from the short LinkedIn post above).
  let blogPostMd = null;
  let linkedinArticleMd = null;
  if (longForm) {
    console.log(`${LOG} Long-form: generating blog post + LinkedIn article for "${topic.id}"...`);
    const article = await callOllamaArticle(
      buildArticlePrompt({ topic, knowledgeBase, history, focus, productName: PRODUCT_NAME }),
    );
    blogPostMd = renderBlogPost({
      topic,
      date,
      article,
      productName: PRODUCT_NAME,
      blogBaseUrl: BLOG_BASE_URL,
      focus,
      video,
    });
    linkedinArticleMd = renderLinkedInArticle({ topic, date, article, productName: PRODUCT_NAME, focus });
  }

  // Product Hunt forum post: gated by a cooldown (PH's own rules cap a
  // dedicated forum at ~2-3 posts/week — see src/productHunt.js) so this
  // silently skips rather than over-posting when run daily.
  let productHuntText = null;
  let phFormat = null;
  if (productHunt) {
    const cooldown = productHuntCooldown(history, { cooldownDays: PRODUCTHUNT_COOLDOWN_DAYS, today: date });
    if (cooldown.inCooldown) {
      console.log(
        `${LOG} Product Hunt: skipped — last forum post was ${cooldown.daysSinceLastPost} day(s) ago ` +
          `(cooldown ${cooldown.cooldownDays} day(s), last on ${cooldown.lastPostDate}).`,
      );
    } else {
      phFormat = selectProductHuntFormat(history);
      console.log(`${LOG} Product Hunt: generating "${phFormat.id}" forum post for "${topic.id}"...`);
      const phPost = await callOllamaProductHunt(
        buildProductHuntPrompt({ topic, history, format: phFormat, productName: PRODUCT_NAME }),
      );
      productHuntText = renderProductHuntPost({ topic, date, format: phFormat, post: phPost, productName: PRODUCT_NAME });
    }
  }

  if (dryRun) {
    console.log('\n=== DRY RUN — nothing written, history unchanged ===\n');
    console.log(socialText);
    console.log(imagePromptText);
    console.log(videoScriptText);
    if (longForm) {
      console.log('\n=== blog-post.md ===\n');
      console.log(blogPostMd);
      console.log('\n=== linkedin-article.md ===\n');
      console.log(linkedinArticleMd);
    }
    if (productHuntText) {
      console.log('\n=== producthunt-post.txt ===\n');
      console.log(productHuntText);
    }
    return;
  }

  const runDir = path.join(OUTPUT_DIR, date);
  await mkdir(runDir, { recursive: true });
  const writes = [
    writeFile(path.join(runDir, 'social-posts.txt'), socialText),
    writeFile(path.join(runDir, 'image-prompt.txt'), imagePromptText),
    writeFile(path.join(runDir, 'video-script.txt'), videoScriptText),
  ];
  if (longForm) {
    writes.push(
      writeFile(path.join(runDir, 'blog-post.md'), blogPostMd),
      writeFile(path.join(runDir, 'linkedin-article.md'), linkedinArticleMd),
    );
  }
  if (productHuntText) {
    writes.push(writeFile(path.join(runDir, 'producthunt-post.txt'), productHuntText));
  }
  await Promise.all(writes);

  const updatedHistory = recordUsage({ knowledgeBase, history, topic, date, focus, producthuntFormat: phFormat });
  await mkdir(path.dirname(POST_HISTORY_PATH), { recursive: true });
  await writeFile(POST_HISTORY_PATH, JSON.stringify(updatedHistory, null, 2));

  console.log(
    `${LOG} Wrote drafts to ${runDir}` +
      `${longForm ? ' (incl. blog-post.md + linkedin-article.md)' : ''}` +
      `${productHuntText ? ' (incl. producthunt-post.txt)' : ''}`,
  );
  console.log(`${LOG} Updated ${POST_HISTORY_PATH} (cycle_number=${updatedHistory.cycle_number})`);
}

const program = new Command();
program.name('social-daily').description('Generate daily social drafts from the RidgeHQ business vault via a local Ollama model');

program
  .command('generate')
  .description('Run the full pipeline once: load vault -> select topic -> Ollama -> platform drafts')
  .option('--dry-run', 'Print formatted drafts to console without writing files or updating history', false)
  .option('--long-form', 'Also generate a website blog post + a LinkedIn article for the same topic', false)
  .option('--producthunt', 'Also generate a Product Hunt forum post, if not in the posting cooldown', false)
  .action(async (opts) => {
    try {
      await runGenerate({ dryRun: opts.dryRun, longForm: opts.longForm, productHunt: opts.producthunt });
    } catch (err) {
      console.error(`${LOG} ${err.message}`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
