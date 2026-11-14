// Story angles within one approved topic. While the registry approves only
// one feature fact for social (claimRules.js TOPIC_FACTS), selectTopic picks
// the same topic every day; the angle rotates instead, least-recently-used
// (same pickLeastUsed as the website focus), so consecutive runs lead with a
// different approved point. Every angle restates a part of the fact's
// approved statement and adds no claim of its own. New topics still need a
// registry fact; this does not widen what may be marketed.

import { pickLeastUsed } from './seoFocus.js';

export const TOPIC_ANGLES = {
  'feature.waivers': [
    { id: 'typed-e-signature', focus: 'lead with the typed e-signature: each guest signs by typing their legal name' },
    { id: 'per-participant', focus: 'lead with per-participant enforcement: every person in a group has their own waiver, not one signature for the whole booking' },
    { id: 'conditional-questions', focus: 'lead with conditional questions: follow-up questions appear only when a participant\'s earlier answers call for them' },
    { id: 'built-in', focus: 'lead with waivers being built into the booking platform instead of a separate paper or spreadsheet process' },
  ],
};

// null when the topic's fact has no angles (the prompts then omit the line).
export function selectAngle(topic, history) {
  const angles = TOPIC_ANGLES[topic.fact_id];
  if (!angles?.length) return null;
  const posts = (history.posts ?? []).filter((p) => p.topic_id === topic.id);
  return pickLeastUsed(angles, posts, 'topic_angle_id');
}
