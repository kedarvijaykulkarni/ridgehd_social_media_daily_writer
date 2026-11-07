import { VIDEO_SEGMENTS } from '../buildVideoScriptPrompt.js';
import { isProductFootage, PRODUCT_FOOTAGE_SEGMENTS } from '../videoCharacter.js';

const RULE = '-'.repeat(64);

// Like image-prompt.txt: a reviewable draft for a human to produce and
// upload by hand. The YouTube title/description block is what the blog
// post's `video:` frontmatter carries — upload with exactly these.
export function renderVideoScript({ topic, date, video, script, productName = 'RidgeHQ', character = null, mode = 'none' }) {
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
  header.push('REVIEW: every claim must be approved for social in wiki/ai-operations/facts/registry.json (CLAUDE.md rule 4).');

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

  const presenter = character ? presenterBlock(character, script.bible, mode) : null;
  return [header.join('\n'), youtube, presenter, body, continuity(script, { character, mode })].filter(Boolean).join('\n\n') + '\n';
}

// AI video models render each 10-second clip independently, so the setting,
// look and voice drift between clips unless every clip prompt restates them
// and starts from the previous clip's last frame. The bible comes from the
// model once; repeating it verbatim per clip is done here, not left to the
// model, so the repetition can't be skipped.
function continuity({ bible, segments }, { character, mode }) {
  const b = Object.fromEntries(Object.entries(bible).map(([k, v]) => [k, v.trim()]));
  const clips = VIDEO_SEGMENTS.map((s, i) => {
    const footage = isProductFootage(mode, i);
    const start = startFrame(segments, mode, i);
    const lines = [
      `CLIP ${i + 1} of ${VIDEO_SEGMENTS.length} (${s.time}, 10 seconds) — ${s.label}${footage ? ' [PRODUCT FOOTAGE]' : ''}`,
    ];
    if (footage) {
      lines.push(
        'USE YOUR REAL PRODUCT SCREEN RECORDING FOR THIS CLIP — do not AI-generate it. The prompt below is the brief for',
        'which part of the product to capture; trim the recording to 10 seconds and lay the voice-over on it.',
      );
    }
    // Footage clips repeat the lock too (as off-screen continuity), so every
    // clip prompt stands alone and the presenter returns unchanged after it.
    if (character) {
      lines.push(
        footage
          ? `Character (identical in every clip — off-screen in this clip, voice-over only): ${character.identity}`
          : `Character (identical in every clip — attach the reference image): ${character.identity}`,
        `Wardrobe (identical in every clip, never changes): ${b.wardrobe}`,
      );
    }
    lines.push(
      `Setting (unchanged in every clip): ${b.setting}`,
      `Look (unchanged): ${b.look}`,
      `Camera (unchanged): ${b.camera}`,
      `Start frame: ${start}`,
      `Action: ${segments[i].visual.trim()}`,
    );
    if (character) {
      lines.push(
        footage
          ? `Voice-over, spoken once and nothing else: "${segments[i].audio.trim()}"`
          : `Dialogue, spoken once by the character on camera, lip-synced, nothing else: "${segments[i].audio.trim()}"`,
        `Human voice (identical in every clip): ${b.voice}`,
        `End frame: ${segments[i].ends_on.trim()}`,
        footage
          ? 'No on-screen text other than what the real recording shows. No music lyrics.'
          : 'Same person, same face, same outfit, same lighting as every other clip. No other people, no scene cuts, no music lyrics, no subtitles.',
      );
    } else {
      lines.push(
        `Narration, spoken once and nothing else: "${segments[i].audio.trim()}"`,
        `Narrator voice (identical in every clip): ${b.voice}`,
        `End frame: ${segments[i].ends_on.trim()}`,
        'Do not change location, time of day, color palette or art style. No scene cuts, no new characters, no music lyrics.',
      );
    }
    return lines.join('\n');
  });

  const notes = character
    ? [
        '- Character consistency: attach the SAME reference image of the character (see PRESENTER',
        '  above) to every clip, in a model with a character/subject-reference feature, or',
        '  generate the keyframe still first and use image-to-video from it.',
        '- Human voice: record yourself, or clone one consented voice once, and use that single',
        '  voice for all six lines (one take, then lip-sync / audio-to-video per clip). Do not let',
        '  each clip invent its own voice and do not use a default TTS voice.',
        '- Wardrobe: if a clip changes the outfit, re-run it — do not fix it in editing.',
        '- Best visual consistency: use image-to-video. Feed each clip the last frame of',
        '  the previous clip as its first-frame image (clip 1: the character keyframe still).',
        '- Keep one seed / one model / one aspect ratio and resolution for all six clips.',
        '- Add one fixed music bed in editing; do not generate music per clip.',
      ]
    : [
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

// Where clip i starts. Normally the previous clip's end frame, without a cut.
// In product mode the film cuts once into the real screen recording and once
// back out; the clip after the footage resumes on the last PRESENTER frame
// (an end frame of a UI clip can't be continued as a presenter shot).
function startFrame(segments, mode, i) {
  if (i === 0) return 'Opening shot of the film.';
  const footage = isProductFootage(mode, i);
  const prevFootage = isProductFootage(mode, i - 1);
  if (footage && !prevFootage) {
    return 'Cut to your real product screen recording — start at the beginning of the product area named in Action.';
  }
  if (!footage && prevFootage) {
    let last = i - 1;
    while (last > 0 && isProductFootage(mode, last)) last--;
    return `Cut back to the presenter, resuming exactly on the last presenter frame (end of clip ${last + 1}): ${segments[last].ends_on.trim()}`;
  }
  return `Begin exactly on this frame, continuing without a cut: ${segments[i - 1].ends_on.trim()}`;
}

// Top-of-file lock: who is on screen, what they wear, how they sound, and what
// is real product footage vs. the character. Identity text comes from .env.
function presenterBlock(character, bible, mode) {
  const lines = [
    RULE,
    'PRESENTER LOCK (same in every clip — do not edit between clips)',
    RULE,
    `Character: ${character.identity}`,
    `Wardrobe: ${bible.wardrobe.trim()}`,
    `Human voice: ${bible.voice.trim()}`,
  ];
  if (character.reference) lines.push(`Reference image to attach to every generation: ${character.reference}`);
  lines.push(
    mode === 'product'
      ? `Visual mode: PRODUCT — clips ${PRODUCT_FOOTAGE_SEGMENTS.map((i) => i + 1).join(', ')} use your real product screen recording; the character opens and closes the film and the same voice runs throughout.`
      : 'Visual mode: CHARACTER — the character is on screen and speaking in all six clips.',
  );
  return lines.join('\n');
}
