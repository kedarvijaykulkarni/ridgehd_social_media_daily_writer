#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { selectTopic, recordUsage } from './selectTopic.js';
import { loadKnowledgeBase } from './loadKnowledgeBase.js';
import { selectFocus } from './seoFocus.js';
import {
  selectProductHuntFormat,
  productHuntCooldown,
  productHuntDiscussionCooldown,
  discussionIsProductFree,
  DISCUSSION_FORMAT,
} from './productHunt.js';
import { buildOllamaPrompt } from './buildOllamaPrompt.js';
import { buildArticlePrompt } from './buildArticlePrompt.js';
import { buildVideoScriptPrompt } from './buildVideoScriptPrompt.js';
import { buildProductHuntPrompt, buildProductHuntDiscussionPrompt } from './buildProductHuntPrompt.js';
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
import { renderProductHuntPost, renderProductHuntDiscussion } from './lib/renderProductHuntPost.js';
import { videoMeta } from './lib/videoMeta.js';
import { loadCharacter, resolveVisualMode } from './videoCharacter.js';
import { renderVideoCoverPrompt } from './lib/renderVideoCoverPrompt.js';
import { parseVideoScript } from './lib/parseVideoScript.js';

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
const PRODUCT_NAME = process.env.PRODUCT_NAME?.trim() || 'RidgeHQ';
const BLOG_BASE_URL = process.env.BLOG_BASE_URL?.trim() || 'https://www.ridgehq.app/blog';
const PRODUCTHUNT_COOLDOWN_DAYS = Number(process.env.PRODUCTHUNT_COOLDOWN_DAYS) || 2;
const PRODUCTHUNT_DISCUSSION_COOLDOWN_DAYS = Number(process.env.PRODUCTHUNT_DISCUSSION_COOLDOWN_DAYS) || 4;

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

async function runGenerate({ dryRun, longForm, productHunt, videoMode }) {
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

  // 1-minute video script: one more Ollama pass, built from the same shared
  // object (headline + image prompt + hook/core message/CTA).
  const video = videoMeta({ topic, shared });
  console.log(`${LOG} Video: generating 1-minute script for "${topic.id}"...`);
  const character = loadCharacter();
  const visualMode = resolveVisualMode(videoMode ?? process.env.VIDEO_VISUAL_MODE, character);
  console.log(`${LOG} Video: visual mode "${visualMode}"${character ? ' (presenter from VIDEO_CHARACTER)' : ''}`);
  const script = await callOllamaVideoScript(
    buildVideoScriptPrompt({ topic, shared, video, productName: PRODUCT_NAME, character, mode: visualMode }),
    { withWardrobe: Boolean(character), mode: visualMode, productName: PRODUCT_NAME },
  );
  const videoScriptText = renderVideoScript({
    topic, date, video, script, productName: PRODUCT_NAME, character, mode: visualMode,
  });
  const imagePromptText = renderImagePrompt({
    topic, date, imagePrompt: shared.image_prompt, productName: PRODUCT_NAME, character, bible: script.bible,
  });
  // YouTube thumbnail prompt for Gemini — no extra Ollama pass; built from the
  // video's title/description + bible, so it must come after the video script.
  const coverPromptText = renderVideoCoverPrompt({
    topic, date, video, bible: script.bible, character, productName: PRODUCT_NAME,
  });

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
  // Two independent blocks in one file, each with its own cooldown: a
  // Self-Promotion product post and a product-free General discussion.
  const phBlocks = [];
  let phFormat = null;
  let phDiscussion = false;
  if (productHunt) {
    const cooldown = productHuntCooldown(history, { cooldownDays: PRODUCTHUNT_COOLDOWN_DAYS, today: date });
    if (cooldown.inCooldown) {
      console.log(
        `${LOG} Product Hunt: self-promotion skipped — last one was ${cooldown.daysSinceLastPost} day(s) ago ` +
          `(cooldown ${cooldown.cooldownDays} day(s), last on ${cooldown.lastPostDate}).`,
      );
    } else {
      phFormat = selectProductHuntFormat(history);
      console.log(`${LOG} Product Hunt: generating "${phFormat.id}" self-promotion post for "${topic.id}"...`);
      const phPost = await callOllamaProductHunt(
        buildProductHuntPrompt({ topic, history, format: phFormat, productName: PRODUCT_NAME }),
      );
      phBlocks.push(renderProductHuntPost({ topic, date, format: phFormat, post: phPost, productName: PRODUCT_NAME }));
    }

    const discussionCooldown = productHuntDiscussionCooldown(history, {
      cooldownDays: PRODUCTHUNT_DISCUSSION_COOLDOWN_DAYS,
      today: date,
    });
    if (discussionCooldown.inCooldown) {
      console.log(
        `${LOG} Product Hunt: General discussion skipped — last one was ${discussionCooldown.daysSinceLastPost} day(s) ago ` +
          `(cooldown ${discussionCooldown.cooldownDays} day(s), last on ${discussionCooldown.lastPostDate}).`,
      );
    } else {
      console.log(`${LOG} Product Hunt: generating General discussion question from theme "${topic.id}"...`);
      const discussion = await callOllamaProductHunt(buildProductHuntDiscussionPrompt({ topic, history }));
      if (discussionIsProductFree(discussion, PRODUCT_NAME)) {
        phDiscussion = true;
        phBlocks.push(renderProductHuntDiscussion({ topic, date, format: DISCUSSION_FORMAT, post: discussion }));
      } else {
        console.log(
          `${LOG} Product Hunt: General discussion dropped — the model named the product, which would read as ` +
            'promotion there. Re-run to try again.',
        );
      }
    }
  }
  const productHuntText = phBlocks.length ? phBlocks.join('\n\n') : null;

  if (dryRun) {
    console.log('\n=== DRY RUN — nothing written, history unchanged ===\n');
    console.log(socialText);
    console.log(imagePromptText);
    console.log(videoScriptText);
    console.log(coverPromptText);
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
    writeFile(path.join(runDir, 'video-cover-image.txt'), coverPromptText),
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

  const updatedHistory = recordUsage({ knowledgeBase, history, topic, date, focus, producthuntFormat: phFormat, producthuntDiscussion: phDiscussion });
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
  .option('--video-mode <mode>', 'Video visuals: "character" (presenter on screen throughout) or "product" (your product screen recording for the demo clips); overrides VIDEO_VISUAL_MODE')
  .action(async (opts) => {
    try {
      await runGenerate({ dryRun: opts.dryRun, longForm: opts.longForm, productHunt: opts.producthunt, videoMode: opts.videoMode });
    } catch (err) {
      console.error(`${LOG} ${err.message}`);
      process.exitCode = 1;
    }
  });

// Write ONLY video-cover-image.txt for an existing run folder, from its
// video-script.txt. No Ollama, no history change, other files untouched.
program
  .command('cover')
  .description('Write video-cover-image.txt (YouTube thumbnail prompt for Gemini) for an existing output/<date>/ folder')
  .requiredOption('--date <YYYY-MM-DD>', 'Run folder under OUTPUT_DIR')
  .option('--character-ref <ref>', 'Presenter reference to attach in Gemini, e.g. "@Olivia" (overrides the reference recorded in video-script.txt)')
  .action(async (opts) => {
    try {
      // Strict format: the value is joined into a path, so nothing like
      // "..\..\x" may reach the filesystem.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) throw new Error(`--date must be YYYY-MM-DD, got "${opts.date}"`);
      const runDir = path.join(OUTPUT_DIR, opts.date);
      const parsed = parseVideoScript(await readFile(path.join(runDir, 'video-script.txt'), 'utf-8'));
      // The presenter recorded in that day's script wins over today's .env, so
      // the cover shows the same person as the video; --character-ref is the
      // only override.
      const reference = opts.characterRef?.trim() || parsed.reference;
      const identity = parsed.identity;
      const character = identity || reference ? { identity, reference } : null;
      const text = renderVideoCoverPrompt({
        topic: parsed.topic, date: opts.date, video: parsed.video, bible: parsed.bible, character, productName: PRODUCT_NAME,
      });
      const out = path.join(runDir, 'video-cover-image.txt');
      await writeFile(out, text);
      console.log(`${LOG} Wrote ${out}`);
    } catch (err) {
      console.error(`${LOG} ${err.message}`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
