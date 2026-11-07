import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDateString } from '../localDate.js';
import { productHuntCooldown } from '../../productHunt.js';

test('localDateString uses the local calendar day, not the UTC one', () => {
  // 00:30 local on 8 Nov is still 7 Nov in UTC anywhere east of Greenwich.
  assert.equal(localDateString(new Date(2026, 10, 8, 0, 30)), '2026-11-08');
  assert.equal(localDateString(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('the Product Hunt cooldown defaults to the local day', () => {
  const history = { posts: [{ date: localDateString(), topic_id: 't', producthunt_format_id: 'f' }] };
  assert.equal(productHuntCooldown(history).daysSinceLastPost, 0);
});
