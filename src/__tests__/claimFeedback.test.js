import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callOllama } from '../callOllama.js';
import { claimProblems } from '../claimRules.js';

const clean = {
  hook_line: 'Waivers before the dock?',
  core_message: 'Digital waivers are built in: typed e-signature, per-participant enforcement and conditional questions.',
  call_to_action: 'Learn more.',
  image_prompt: 'a dock at dawn',
};
const dirty = { ...clean, core_message: 'Our integrated waiver system replaces your spreadsheets.' };

// Stub Ollama: answers in order, recording every prompt it was sent.
function stubOllama(t, answers) {
  const prompts = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    prompts.push(JSON.parse(init.body).prompt);
    const next = answers.shift();
    return { ok: true, json: async () => ({ response: typeof next === 'string' ? next : JSON.stringify(next) }) };
  };
  t.after(() => { globalThis.fetch = original; });
  return prompts;
}

test('an answer that breaks the claim rules is retried once, quoting the offending phrases', async (t) => {
  const prompts = stubOllama(t, [dirty, clean]);
  const shared = await callOllama('PROMPT', { host: 'http://stub', claimCheck: claimProblems });
  assert.equal(shared.core_message, clean.core_message);
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /broke the CLAIM RULES with these phrases:[\s\S]*integrated/);
});

test('a clean answer is not retried', async (t) => {
  const prompts = stubOllama(t, [clean]);
  await callOllama('PROMPT', { host: 'http://stub', claimCheck: claimProblems });
  assert.equal(prompts.length, 1);
});

test('drift never fails the run: a still-dirty retry is kept, a broken retry falls back to the first answer', async (t) => {
  stubOllama(t, [dirty, { ...dirty, core_message: 'Still integrated.' }]);
  assert.equal((await callOllama('P', { host: 'http://stub', claimCheck: claimProblems })).core_message, 'Still integrated.');

  stubOllama(t, [dirty, 'not json at all']);
  assert.equal((await callOllama('P', { host: 'http://stub', claimCheck: claimProblems })).core_message, dirty.core_message);
});
