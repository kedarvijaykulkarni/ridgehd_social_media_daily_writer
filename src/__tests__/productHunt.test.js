import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectProductHuntFormat, productHuntCooldown, PRODUCTHUNT_FORMATS } from '../productHunt.js';
import { recordUsage } from '../selectTopic.js';

const TOPIC = { id: 't1', category: 'feature', status: 'shipped', headline: 'Waiver system' };
const KB = [TOPIC];

test('format rotation visits every format before repeating', () => {
  let history = { posts: [], cycle_number: 1 };
  const seen = new Set();
  for (let day = 1; day <= PRODUCTHUNT_FORMATS.length; day++) {
    const format = selectProductHuntFormat(history);
    seen.add(format.id);
    const date = `2026-10-${String(day).padStart(2, '0')}`;
    history = recordUsage({ knowledgeBase: KB, history, topic: TOPIC, date, producthuntFormat: format });
  }
  assert.equal(seen.size, PRODUCTHUNT_FORMATS.length);
  assert.equal(history.posts[0].producthunt_format_id, PRODUCTHUNT_FORMATS[0].id);
});

test('legacy history without producthunt_format_id starts at the first format', () => {
  const format = selectProductHuntFormat({ posts: [{ date: '2026-09-01', topic_id: 'x' }] });
  assert.equal(format.id, PRODUCTHUNT_FORMATS[0].id);
});

test('a generate run with no producthuntFormat does not record one', () => {
  const history = recordUsage({ knowledgeBase: KB, history: { posts: [] }, topic: TOPIC, date: '2026-10-01' });
  assert.ok(!('producthunt_format_id' in history.posts[0]));
});

test('no cooldown when the forum has never been posted to', () => {
  const result = productHuntCooldown({ posts: [] }, { cooldownDays: 2, today: '2026-10-10' });
  assert.equal(result.inCooldown, false);
  assert.equal(result.lastPostDate, null);
});

test('in cooldown the day after a forum post with a 2-day cooldown', () => {
  const history = { posts: [{ date: '2026-10-10', producthunt_format_id: 'playbook' }] };
  const result = productHuntCooldown(history, { cooldownDays: 2, today: '2026-10-11' });
  assert.equal(result.inCooldown, true);
  assert.equal(result.daysSinceLastPost, 1);
  assert.equal(result.lastPostDate, '2026-10-10');
});

test('cooldown clears once enough days have passed', () => {
  const history = { posts: [{ date: '2026-10-10', producthunt_format_id: 'playbook' }] };
  const result = productHuntCooldown(history, { cooldownDays: 2, today: '2026-10-12' });
  assert.equal(result.inCooldown, false);
  assert.equal(result.daysSinceLastPost, 2);
});

test('cooldown ignores non-forum posts and uses the most recent forum post', () => {
  const history = {
    posts: [
      { date: '2026-10-05', producthunt_format_id: 'behind_the_scenes' },
      { date: '2026-10-09' }, // ordinary social-only run, no forum post
      { date: '2026-10-10', producthunt_format_id: 'changelog' },
    ],
  };
  const result = productHuntCooldown(history, { cooldownDays: 2, today: '2026-10-11' });
  assert.equal(result.lastPostDate, '2026-10-10');
  assert.equal(result.inCooldown, true);
});
