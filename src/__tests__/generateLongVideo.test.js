import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { VERTICALS } from '../seoFocus.js';

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));

test('generate:long sends Brain topic and audience context to Ollama and writes the resulting video script', async (t) => {
  const temp = await mkdtemp(path.join(tmpdir(), 'ridgehq-long-video-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const promptLog = path.join(temp, 'prompts.jsonl');
  const vault = path.join(temp, 'vault');
  await cp(path.join(root, 'src/__tests__/fixtures/vault'), vault, { recursive: true });
  const registryPath = path.join(vault, 'wiki/ai-operations/facts/registry.json');
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  for (const fact of registry.facts) fact.review_by = '9999-12-31';
  await writeFile(registryPath, JSON.stringify(registry));
  const approvedDetail = registry.facts.find(f => f.id === 'feature.waivers').statement;
  const shared = {
    hook_line: 'Who signs for each participant?',
    core_message: approvedDetail,
    call_to_action: 'Learn more about RidgeHQ.',
    image_prompt: 'A surreal coral river flows through the boats.',
  };
  const audio = [
    'Who signs for each participant?', 'Each person has their own waiver.',
    'Digital waivers are built into RidgeHQ.', 'Signing uses a typed e-signature.',
    'Your team can review this signing approach.', 'Visit ridgehq.app to learn more.',
  ];
  const script = {
    bible: { setting: 'Kayak reception beside the dock.', look: 'Natural afternoon daylight.', camera: 'Eye-level medium shot.', voice: 'Warm female voice.', wardrobe: 'Navy jacket.', cast: 'None; presenter only' },
    segments: audio.map((line, i) => ({ visual: `Maya addresses camera at the kayak reception, gesture ${i}.`, audio: line, ends_on: 'Maya facing camera, hands at waist level.' })),
  };
  const article = { title: 'Digital waivers', slug: 'waivers-kayak-schools', sections: [{ heading: 'Typed signing', body: shared.core_message }] };
  const preload = path.join(temp, 'ollama-stub.mjs');
  await writeFile(preload, `import { appendFile } from 'node:fs/promises';
const answers = ${JSON.stringify([shared, script, article])};
globalThis.fetch = async (_url, init) => {
  await appendFile(${JSON.stringify(promptLog)}, JSON.stringify(JSON.parse(init.body).prompt) + '\\n');
  if (!answers.length) throw new Error('Unexpected extra Ollama call');
  return { ok: true, json: async () => ({ response: JSON.stringify(answers.shift()) }) };
};`);
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const [runtime, ...args] = pkg.scripts['generate:long'].split(' ');
  assert.equal(runtime, 'node');
  const output = path.join(temp, 'output');
  const command = ['--import', pathToFileURL(preload).href, ...args];
  const options = {
    cwd: root,
    env: {
      ...process.env,
      BUSINESS_VAULT_PATH: vault,
      POST_HISTORY_PATH: path.join(temp, 'history.json'),
      OUTPUT_DIR: output,
      PRODUCT_NAME: 'RidgeHQ', VIDEO_CHARACTER: 'Maya, South Asian woman in her early thirties',
      VIDEO_CHARACTER_REF: 'maya-reference.png', VIDEO_LOGO_REF: '', VIDEO_VISUAL_MODE: 'character',
    },
    maxBuffer: 1024 * 1024,
  };
  const { stdout } = await execFileAsync(process.execPath, command, options);
  const prompts = (await readFile(promptLog, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(prompts.length, 3, 'short-form, video and long-form passes');
  const videoPrompt = prompts[1];
  assert.match(videoPrompt, /ID: waiver-system/);
  assert.ok(videoPrompt.includes(`Approved detail: ${shared.core_message}`));
  assert.ok(videoPrompt.includes(`Live-action photorealism in ${VERTICALS[0].scene}`));
  assert.ok(videoPrompt.includes(`Audience: ${VERTICALS[0].name}`));
  assert.match(videoPrompt, /TOPIC-SPECIFIC SHOT BRIEF/);
  assert.match(videoPrompt, /Focus on participant signing, not payments or check-in/);
  assert.doesNotMatch(videoPrompt, /surreal coral river/);
  const date = stdout.match(/RidgeHQ video script — (\d{4}-\d{2}-\d{2})/)?.[1] ??
    JSON.parse(await readFile(path.join(temp, 'history.json'), 'utf8')).posts[0].date;
  const saved = await readFile(path.join(output, date, 'video-script.txt'), 'utf8');
  assert.match(saved, /Topic: waiver-system/);
  assert.ok(saved.includes(script.bible.setting));
  assert.ok(saved.includes(audio[3]));
  assert.equal(saved.match(/^Realism lock:/gm).length, 6);
  const runDir = path.join(output, date);
  const blog = await readFile(path.join(runDir, 'waivers-kayak-schools.md'), 'utf8');
  assert.match(blog, /^slug: "waivers-kayak-schools"$/m);
  assert.match(blog, /Digital waivers/);
  await assert.rejects(readFile(path.join(runDir, 'blog-post.md')), { code: 'ENOENT' });

  await writeFile(path.join(runDir, 'notes.md'), 'My review notes.');
  await writeFile(path.join(runDir, 'blog-post.md'), 'Legacy fixed-name draft.');
  const historyBefore = await readFile(path.join(temp, 'history.json'), 'utf8');
  const dry = await execFileAsync(process.execPath, [...command, '--dry-run'], options);
  assert.match(dry.stdout, /=== waivers-kayak-schools.md ===/);
  assert.equal(await readFile(path.join(temp, 'history.json'), 'utf8'), historyBefore);
  assert.equal(await readFile(path.join(runDir, 'blog-post.md'), 'utf8'), 'Legacy fixed-name draft.');

  const stub = await readFile(preload, 'utf8');
  const updatedArticle = { ...article, slug: 'digital-waivers-kayak-schools' };
  await writeFile(preload, stub.replace(JSON.stringify([shared, script, article]), JSON.stringify([shared, script, updatedArticle])));
  await execFileAsync(process.execPath, command, options);
  await assert.rejects(readFile(path.join(runDir, 'waivers-kayak-schools.md')), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(runDir, 'blog-post.md')), { code: 'ENOENT' });
  assert.match(await readFile(path.join(runDir, 'digital-waivers-kayak-schools.md'), 'utf8'), /^slug: "digital-waivers-kayak-schools"$/m);

  await execFileAsync(process.execPath, command.filter(arg => arg !== '--long-form'), options);
  await assert.rejects(readFile(path.join(runDir, 'digital-waivers-kayak-schools.md')), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(runDir, 'linkedin-article.md')), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(runDir, 'notes.md'), 'utf8'), 'My review notes.');
});
