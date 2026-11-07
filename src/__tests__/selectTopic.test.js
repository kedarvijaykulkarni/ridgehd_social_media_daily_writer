import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectTopic, withoutRunsOn } from '../selectTopic.js';
import { productHuntCooldown } from '../productHunt.js';

const KB = [
  { id: 'a', status: 'shipped' },
  { id: 'b', status: 'shipped' },
];

test('a same-day re-run replaces that day: its overwritten topic is no longer counted as covered', () => {
  const loaded = {
    cycle_number: 1,
    posts: [
      { date: '2026-11-05', topic_id: 'b' },
      { date: '2026-11-06', topic_id: 'a', producthunt_format_id: 'playbook' },
    ],
  };
  const { history, replaced } = withoutRunsOn(loaded, '2026-11-06');
  assert.equal(replaced, 1);
  assert.deepEqual(history.posts.map((p) => p.date), ['2026-11-05']);
  // "a" was only covered by the run being replaced, so it is picked again.
  assert.equal(selectTopic(KB, history).id, 'a');
  // Today's own Product Hunt post no longer blocks its retry.
  assert.equal(productHuntCooldown(history, { today: '2026-11-06' }).inCooldown, false);
});

test('withoutRunsOn leaves other days untouched', () => {
  const loaded = { posts: [{ date: '2026-11-05', topic_id: 'b' }] };
  const { history, replaced } = withoutRunsOn(loaded, '2026-11-06');
  assert.equal(replaced, 0);
  assert.deepEqual(history.posts, loaded.posts);
});
