import { VIDEO_SEGMENTS } from '../buildVideoScriptPrompt.js';

const RULE = '-'.repeat(64);

// Like image-prompt.txt: a reviewable draft for a human to produce and
// upload by hand. The YouTube title/description block is what the blog
// post's `video:` frontmatter carries — upload with exactly these.
export function renderVideoScript({ topic, date, video, script, productName = 'AquaRoster' }) {
  const header = [
    `${productName} video script — ${date}`,
    `Topic: ${topic.id}${topic.headline ? ` — ${topic.headline}` : ''}`,
  ];
  if (topic.status !== 'shipped') {
    header.push(
      `⚠️ ROADMAP: topic status is "${topic.status}" — every line must stay in`,
      `future/"coming soon" framing. Fix any present-tense claim before recording.`,
    );
  }
  header.push('REVIEW: verify every claim against wiki/business-context.md §2 (CLAUDE.md rule 4).');

  const youtube = [
    RULE,
    'YOUTUBE TITLE + DESCRIPTION (paste exactly — blog frontmatter must match)',
    RULE,
    `Title: ${video.title}`,
    `Description: ${video.description}`,
  ].join('\n');

  const segments = VIDEO_SEGMENTS.map((s, i) =>
    [`${s.time} — ${s.label}`, `Visual: ${script.segments[i].visual.trim()}`, `Audio: ${script.segments[i].audio.trim()}`].join(
      '\n',
    ),
  );
  const body = [RULE, 'SCRIPT (1 min, from Ollama — edit before recording)', RULE, segments.join('\n\n')].join('\n');

  return [header.join('\n'), youtube, body].join('\n\n') + '\n';
}
