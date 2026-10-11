import { test } from 'node:test';
import assert from 'node:assert/strict';
import { videoMeta } from '../videoMeta.js';

test('title is the topic headline; description is hook line + core message', () => {
  const meta = videoMeta({
    topic: { headline: 'Waiver system lacks: QR-linked signing' },
    shared: { hook_line: 'Move beyond paperwork.', core_message: 'Digital waivers are coming soon.' },
  });
  assert.equal(meta.title, 'Waiver system lacks: QR-linked signing');
  assert.equal(meta.description, 'Move beyond paperwork. Digital waivers are coming soon.');
});

test('title is clipped to the YouTube 100-character limit', () => {
  const meta = videoMeta({ topic: { headline: 'x'.repeat(150) }, shared: { core_message: 'c' } });
  assert.equal(meta.title.length, 100);
  assert.equal(meta.description, 'c');
});
