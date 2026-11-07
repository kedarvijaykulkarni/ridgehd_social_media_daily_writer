// Rebuild what renderVideoCoverPrompt needs from an already-written
// video-script.txt, so a cover prompt can be made for an existing day without
// re-running Ollama (and without touching the other files).
export function parseVideoScript(text) {
  const line = (re) => text.match(re)?.[1]?.trim() ?? null;
  const topicLine = line(/^Topic: (.+)$/m);
  const [id, ...rest] = (topicLine ?? '').split(' — ');
  const title = line(/^Title: (.+)$/m);
  const description = line(/^Description: (.+)$/m);
  if (!title || !description) throw new Error('video-script.txt has no YouTube Title/Description block');
  const clip1 = text.slice(Math.max(0, text.indexOf('CLIP 1 of')));
  const grab = (re) => clip1.match(re)?.[1]?.trim();
  return {
    topic: {
      id: id || 'unknown',
      headline: rest.join(' — ') || title,
      // Keep the exact non-shipped status ("planned", "unverified", ...) so the
      // cover's roadmap warning says the same thing the script did.
      status: line(/^⚠️ ROADMAP: topic status is "([^"]+)"/m) ?? 'shipped',
    },
    video: { title, description },
    bible: {
      setting: grab(/^Setting \(unchanged in every clip\): (.+)$/m),
      look: grab(/^Look \(unchanged\): (.+)$/m),
      wardrobe: grab(/^Wardrobe \(identical in every clip, never changes\): (.+)$/m),
    },
    identity: grab(/^Character \(identical in every clip[^)]*\): (.+)$/m) ?? null,
    reference: line(/^Reference image to attach to every generation: (.+)$/m),
  };
}
