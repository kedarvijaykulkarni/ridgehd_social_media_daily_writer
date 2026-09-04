import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHashtagPool } from '../hashtags.js';

// Regression: hashtag sanitization only stripped whitespace, leaving
// hyphens/apostrophes/other punctuation in the tag — every target platform
// (X, LinkedIn, Instagram, Reddit) truncates a hashtag at the first
// non-alphanumeric character, so "#multi-tenantarchitecture" rendered as
// the tag "#multi" followed by plain, non-tagged text "-tenantarchitecture".
// Found by /qa on 2026-07-14.
test('buildHashtagPool strips hyphens and other punctuation from generated tags', () => {
  const pool = buildHashtagPool({
    hashtags_broad_niche: ['multi-tenant architecture', "diver's log"],
    hashtags_saas_niche: ['SaaS Ops'],
  });
  assert.deepEqual(pool, ['#multitenantarchitecture', '#SaaSOps', '#diverslog']);
});

test('buildHashtagPool sanitizes tags the model already prefixed with #, including internal spaces', () => {
  const pool = buildHashtagPool({
    hashtags_broad_niche: ['#Already Hashed Extra'],
    hashtags_saas_niche: [],
  });
  assert.deepEqual(pool, ['#AlreadyHashedExtra']);
});

test('buildHashtagPool interleaves broad and saas pools and dedupes', () => {
  const pool = buildHashtagPool({
    hashtags_broad_niche: ['diving', 'scuba'],
    hashtags_saas_niche: ['saas', 'b2b'],
  });
  assert.deepEqual(pool, ['#diving', '#saas', '#scuba', '#b2b']);
});

test('buildHashtagPool handles missing pool keys', () => {
  const pool = buildHashtagPool({});
  assert.deepEqual(pool, []);
});
