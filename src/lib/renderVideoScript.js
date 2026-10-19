import { VIDEO_SEGMENTS } from '../buildVideoScriptPrompt.js';

const RULE = '-'.repeat(64);

// Like image-prompt.txt: a reviewable draft for a human to produce and
// upload by hand. The YouTube title/description block is what the blog
// post's `video:` frontmatter carries — upload with exactly these.
export function renderVideoScript({ topic, date, video, script, productName = 'RidgeHQ' }) {
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
    [
      `${s.time} — ${s.label}`,
      `Visual: ${script.segments[i].visual.trim()}`,
      `Audio: ${script.segments[i].audio.trim()}`,
      `Ends on: ${script.segments[i].ends_on.trim()}`,
    ].join('\n'),
  );
  const body = [RULE, 'SCRIPT (1 min, from Ollama — edit before recording)', RULE, segments.join('\n\n')].join('\n');

  return [header.join('\n'), youtube, body, continuity(script)].join('\n\n') + '\n';
}

// AI video models render each 10-second clip independently, so the setting,
// look and voice drift between clips unless every clip prompt restates them
// and starts from the previous clip's last frame. The bible comes from the
// model once; repeating it verbatim per clip is done here, not left to the
// model, so the repetition can't be skipped.
function continuity({ bible, segments }) {
  const b = Object.fromEntries(Object.entries(bible).map(([k, v]) => [k, v.trim()]));
  const clips = VIDEO_SEGMENTS.map((s, i) => {
    const start =
      i === 0
        ? 'Opening shot of the film.'
        : `Begin exactly on this frame, continuing without a cut: ${segments[i - 1].ends_on.trim()}`;
    return [
      `CLIP ${i + 1} of ${VIDEO_SEGMENTS.length} (${s.time}, 10 seconds) — ${s.label}`,
      `Setting (unchanged in every clip): ${b.setting}`,
      `Look (unchanged): ${b.look}`,
      `Camera (unchanged): ${b.camera}`,
      `Start frame: ${start}`,
      `Action: ${segments[i].visual.trim()}`,
      `Narration, spoken once and nothing else: "${segments[i].audio.trim()}"`,
      `Narrator voice (identical in every clip): ${b.voice}`,
      `End frame: ${segments[i].ends_on.trim()}`,
      'Do not change location, time of day, color palette or art style. No scene cuts, no new characters, no music lyrics.',
    ].join('\n');
  });

  const notes = [
    '- Best voice consistency: generate the 6 audio lines as ONE narration take in a',
    '  single TTS voice matching the narrator description, then lay it over the',
    '  silent clips. Do not let each clip generate its own voice.',
    '- Best visual consistency: use image-to-video. Feed each clip the last frame of',
    '  the previous clip as its first-frame image (clip 1: a still of the opening shot).',
    '- Keep one seed / one model / one aspect ratio and resolution for all six clips.',
    '- Add one fixed music bed in editing; do not generate music per clip.',
  ];

  return [
    RULE,
    'CONTINUITY KIT — paste one CLIP prompt per 10-second generation, in order',
    RULE,
    clips.join('\n\n'),
    '',
    'PRODUCTION NOTES',
    ...notes,
  ].join('\n');
}
