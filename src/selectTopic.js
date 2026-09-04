// Coverage-first topic selection. `knowledge-base.json` is read-only input
// (produced by Prompt 1) and its own `used_count` field is just the initial
// seed value — the real, live used_count is derived here from
// post-history.json's `posts` array, since that's the file this tool is
// allowed to write to.

function usedCountFor(topicId, posts) {
  return posts.filter((p) => p.topic_id === topicId).length;
}

function lastUsedTimestamp(topicId, posts) {
  const dates = posts.filter((p) => p.topic_id === topicId).map((p) => new Date(p.date).getTime());
  return dates.length ? Math.max(...dates) : -Infinity;
}

// Sort key: lowest used_count first; ties broken by status (shipped before
// planned/unverified); further ties broken by least-recently-used; final
// tiebreak is the topic id, for a fully deterministic, auditable order.
export function selectTopic(knowledgeBase, history) {
  const posts = history.posts ?? [];
  const scored = knowledgeBase.map((entry) => ({
    entry,
    usedCount: usedCountFor(entry.id, posts),
    lastUsed: lastUsedTimestamp(entry.id, posts),
  }));

  scored.sort((a, b) => {
    if (a.usedCount !== b.usedCount) return a.usedCount - b.usedCount;
    const aShipped = a.entry.status === 'shipped';
    const bShipped = b.entry.status === 'shipped';
    if (aShipped !== bShipped) return aShipped ? -1 : 1;
    if (a.lastUsed !== b.lastUsed) return a.lastUsed - b.lastUsed;
    return a.entry.id.localeCompare(b.entry.id);
  });

  return scored[0].entry;
}

// Appends the day's pick to history and recomputes cycle_number: once every
// `status: shipped` entry's derived used_count is >= cycle_number, the cycle
// increments and rotation starts over (this is what eventually lets
// planned/unverified entries surface, once shipped coverage catches up).
export function recordUsage({ knowledgeBase, history, topic, date }) {
  const posts = [...(history.posts ?? []), { date, topic_id: topic.id, angle_used: topic.category }];
  let cycleNumber = history.cycle_number ?? 1;

  const shipped = knowledgeBase.filter((e) => e.status === 'shipped');
  const allShippedCovered = shipped.every((e) => usedCountFor(e.id, posts) >= cycleNumber);
  if (allShippedCovered) cycleNumber += 1;

  return { posts, cycle_number: cycleNumber };
}
