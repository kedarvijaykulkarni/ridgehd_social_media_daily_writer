import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateArticleShape } from '../callOllama.js';

function wellFormed() {
  return {
    title: 'Running a dive center on an AI copilot',
    dek: 'What changes when the assistant can act on the schedule.',
    linkedin_hook: "I've watched dive shops lose mornings to spreadsheet triage.",
    meta_description: 'How an AI copilot built into the operational core changes dive center scheduling.',
    slug: 'dive-center-ai-copilot',
    tags: ['dive operations', 'ai', 'saas'],
    sections: [
      { heading: 'The problem', body: 'Operators juggle tools.' },
      { heading: 'The shift', body: 'One code path for humans and AI.' },
    ],
    key_takeaways: ['AI acts through the same permissions', 'Audit trail separates AI from human'],
    cta: 'See how the copilot handles a weather day.',
  };
}

test('validateArticleShape accepts a well-formed article', () => {
  const a = validateArticleShape(wellFormed());
  assert.equal(a.title, 'Running a dive center on an AI copilot');
});

test('validateArticleShape defaults optional array fields', () => {
  const input = wellFormed();
  delete input.tags;
  delete input.key_takeaways;
  const a = validateArticleShape(input);
  assert.deepEqual(a.tags, []);
  assert.deepEqual(a.key_takeaways, []);
});

test('validateArticleShape rejects a missing title', () => {
  const input = wellFormed();
  delete input.title;
  assert.throws(() => validateArticleShape(input), /title/i);
});

test('validateArticleShape rejects empty sections', () => {
  const input = wellFormed();
  input.sections = [];
  assert.throws(() => validateArticleShape(input), /section/i);
});

test('validateArticleShape rejects a section missing its body', () => {
  const input = wellFormed();
  input.sections = [{ heading: 'Orphan heading' }];
  assert.throws(() => validateArticleShape(input), /section/i);
});
