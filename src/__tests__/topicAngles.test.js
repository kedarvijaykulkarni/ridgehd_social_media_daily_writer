import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectAngle, TOPIC_ANGLES } from '../topicAngles.js';
import { recordUsage } from '../selectTopic.js';
import { buildOllamaPrompt } from '../buildOllamaPrompt.js';
import { selectFocus } from '../seoFocus.js';

const TOPIC = { id: 'waiver-system', fact_id: 'feature.waivers', status: 'shipped', headline: 'Waivers', detail: 'd', category: 'feature' };

test('angles rotate least-recently-used per topic, so the same topic leads with a new point each run', () => {
  let history = { posts: [] };
  const seen = [];
  for (let day = 1; day <= TOPIC_ANGLES['feature.waivers'].length; day++) {
    const angle = selectAngle(TOPIC, history);
    seen.push(angle.id);
    const topic = { ...TOPIC, angle_id: angle.id };
    history = recordUsage({ knowledgeBase: [TOPIC], history, topic, date: `2026-11-0${day}` });
  }
  assert.equal(new Set(seen).size, seen.length);
  assert.equal(history.posts.at(-1).topic_angle_id, seen.at(-1));
  // Next run starts the cycle again from the oldest angle.
  assert.equal(selectAngle(TOPIC, history).id, seen[0]);
});

test('a topic without angles gets none and the prompt omits the line', () => {
  assert.equal(selectAngle({ ...TOPIC, fact_id: 'other' }, { posts: [] }), null);
  const focus = selectFocus({ posts: [] });
  const plain = buildOllamaPrompt({ topic: TOPIC, knowledgeBase: [TOPIC], history: { posts: [] }, focus });
  assert.doesNotMatch(plain, /This run's angle/);
  const angled = buildOllamaPrompt({ topic: { ...TOPIC, focus_angle: 'lead with X' }, knowledgeBase: [TOPIC], history: { posts: [] }, focus });
  assert.match(angled, /This run's angle: lead with X/);
});
