// Product Hunt forum content rotation + posting cooldown.
//
// Context (from the maintainer's own research into PH's community rules):
// hard-selling, link-dropping, upvote requests, and copy-pasted engagement
// get accounts flagged or locked. Safe content is utility/education/
// build-in-public, and even a dedicated product forum should post only
// 2-3x/week, not daily. This module enforces the frequency side; the prompt
// (buildProductHuntPrompt.js) enforces the content-style side.
//
// Same rotation pattern as seoFocus.js: least-used first, then
// least-recently-used, then list order, counted from post-history's
// `producthunt_format_id` field.

import { pickLeastUsed } from './seoFocus.js';

export const FORUM_URL = 'https://www.producthunt.com/p/ridgehq-app';

// The "Welcome & Roadmap" pinned thread and reactive "Bug Reports" thread
// from that research are one-off / reactive, not daily-rotation content —
// deliberately left out of this list.
export const PRODUCTHUNT_FORMATS = [
  {
    id: 'behind_the_scenes',
    name: 'Behind-the-scenes / build in public',
    instructions:
      'Describe a real engineering or design challenge behind the PRIMARY TOPIC — ' +
      'what was hard about it and why you built it the way you did. Readers should ' +
      'learn something about the build, not just hear that a feature exists.',
  },
  {
    id: 'playbook',
    name: 'Industry insight / playbook',
    instructions:
      'Write a short, concrete playbook or insight for people running an activity ' +
      'business (dive centers, surf/ski schools, rentals, tours) related to the ' +
      'PRIMARY TOPIC. Give real, usable advice — do not just describe the product.',
  },
  {
    id: 'changelog',
    name: 'Product changelog / update',
    instructions:
      'Explain what you shipped (the PRIMARY TOPIC), why you built it, and how it ' +
      'helps the people using it day to day. This only makes sense for a SHIPPED ' +
      'topic — if the topic is not shipped, frame it as a roadmap update instead ' +
      "(what you're building and why, not a changelog entry).",
  },
  {
    id: 'feedback_ask',
    name: 'Weekly feedback ask',
    instructions:
      'Ask the community a genuine, specific question for feedback related to the ' +
      'PRIMARY TOPIC (e.g. a UI/UX choice, a pricing question, a workflow decision). ' +
      'The post must read as an open question you actually want answered, not a ' +
      'pitch with a question mark at the end.',
  },
];

export function selectProductHuntFormat(history) {
  const posts = history.posts ?? [];
  return pickLeastUsed(PRODUCTHUNT_FORMATS, posts, 'producthunt_format_id');
}

// Most recent post date carrying a producthunt_format_id, or null if the
// forum has never been posted to.
function lastProductHuntPostDate(history) {
  const posts = (history.posts ?? []).filter((p) => p.producthunt_format_id);
  if (!posts.length) return null;
  return posts.reduce((latest, p) => (new Date(p.date) > new Date(latest) ? p.date : latest), posts[0].date);
}

// Whole-day difference, not a strict millisecond one — "today" and "2 days
// ago" should compare the same regardless of time of day.
function daysBetween(dateA, dateB) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const a = new Date(`${dateA}T00:00:00Z`).getTime();
  const b = new Date(`${dateB}T00:00:00Z`).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

// Returns { inCooldown, lastPostDate, daysSinceLastPost, cooldownDays }.
// `cooldownDays` is the minimum gap between forum posts — default 2 caps
// frequency at roughly 3x/week per PH's own guidance for a dedicated forum.
export function productHuntCooldown(history, { cooldownDays = 2, today = new Date().toISOString().slice(0, 10) } = {}) {
  const lastPostDate = lastProductHuntPostDate(history);
  if (!lastPostDate) {
    return { inCooldown: false, lastPostDate: null, daysSinceLastPost: null, cooldownDays };
  }
  const daysSinceLastPost = daysBetween(lastPostDate, today);
  return { inCooldown: daysSinceLastPost < cooldownDays, lastPostDate, daysSinceLastPost, cooldownDays };
}
