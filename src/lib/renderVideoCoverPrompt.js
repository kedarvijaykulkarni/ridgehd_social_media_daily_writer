import { SITE_HOST } from '../buildVideoScriptPrompt.js';

const RULE = '-'.repeat(64);

// First sentence of the video description is the hook ("Stop worrying about
// unintended operational changes."). The thumbnail headline is a 3-5 word
// compression of it — written by Gemini, not by this tool, so it can't drift
// into a claim the description doesn't make (CLAUDE.md rule 4).
export function coverHook(description) {
  const first = (description ?? '').trim().split(/(?<=[.!?])\s+/)[0] ?? '';
  return first.replace(/[.!?]+$/, '').trim();
}

// YouTube thumbnail prompt for Gemini (video-cover-image.txt). Like
// image-prompt.txt it is a reviewable draft: this tool never calls an image
// API. `bible`/`character` are optional so the file can also be built from an
// older video-script.txt that predates the presenter feature.
export function renderVideoCoverPrompt({ topic, date, video, bible = {}, character = null, productName = 'RidgeHQ' }) {
  const hook = coverHook(video.description);
  const person = character
    ? [
        character.reference
          ? `Use the attached reference image (${character.reference}) as the presenter — keep the face, hair, skin tone and build EXACTLY the same as the reference.`
          : 'Use the attached reference image as the presenter — keep the face, hair, skin tone and build exactly the same.',
        character.identity ? `Presenter: ${character.identity}.` : null,
        `Outfit: ${bible.wardrobe?.trim() || 'an outfit suited to the setting below (same outfit as the video)'}.`,
        'Expression: confident, relieved, slightly smiling, looking straight into the camera. Natural skin texture, correct hands.',
      ].filter(Boolean)
    : ['No people in the image — make the scene itself the hero.'];

  const prompt = [
    'Create a high-CTR YouTube thumbnail, 16:9 landscape (1920x1080, export 1280x720), photo-realistic, cinematic, sharp focus.',
    '',
    `Video title (context only): ${video.title}`,
    `Video description (context only): ${video.description}`,
    '',
    'SUBJECT',
    ...person,
    '',
    'SCENE',
    `${bible.setting?.trim() || 'The business setting that matches the topic.'} ${bible.look?.trim() || ''}`.trim(),
    'Background slightly blurred so the subject and text pop; keep the scene recognisably the same place as the video.',
    '',
    'COMPOSITION',
    character
      ? '- Subject large on the RIGHT third (head and shoulders to waist), face about 35-40% of frame height, rim-lit with a soft glow.'
      : "- The scene's key object large on the RIGHT third, rim-lit with a soft glow. No people, faces, hands or silhouettes anywhere.",
    '- LEFT two-thirds kept clean for text. Strong contrast, rich saturation, subtle vignette.',
    '- One simple visual cue that matches the topic (e.g. a glowing shield, checkmark, calendar or price tag) — one only, no clutter.',
    '- Palette: deep navy-teal base, ONE sparing coral accent, white text.',
    '',
    'TEXT ON IMAGE (render exactly, spelled correctly, nothing else)',
    `- Headline: write 3-5 punchy words, ALL CAPS, bold heavy sans-serif, max 2 lines, compressed from this hook: "${hook}". Use only what the hook says — no numbers, percentages or promises that are not in the description.`,
    '- Make ONE key word of the headline coral; the rest white with a thin dark outline/shadow so it reads at 168x94 px.',
    `- Small tag bottom-left: "${SITE_HOST}" (white, small).`,
    '',
    `AVOID: any other text, watermarks, competitor logos, fake dashboards or numbers, ${character ? 'extra people, distorted hands/faces' : 'any people or faces'}, misspelled words, red "play" buttons, clickbait claims.`,
  ].join('\n');

  const header = [
    `${productName} video cover image prompt (YouTube thumbnail) — ${date}`,
    `Topic: ${topic.id}${topic.headline ? ` — ${topic.headline}` : ''}`,
  ];
  if (topic.status && topic.status !== 'shipped') {
    header.push(`⚠️ ROADMAP: topic status is "${topic.status}" — keep the headline in "coming soon" framing, never "now available".`);
  }
  header.push('REVIEW: every claim must be approved for social in wiki/ai-operations/facts/registry.json (CLAUDE.md rule 4).');

  const howTo = [
    RULE,
    'HOW TO USE IN GEMINI',
    RULE,
    character
      ? '1. Open Gemini and attach your presenter reference image (the same one used for the video clips), e.g. @Olivia.'
      : '1. Open Gemini. No reference image — this video has no presenter, so the thumbnail has no people.',
    '2. Paste the prompt above. Ask for 3-4 variations and pick the most readable one.',
    character
      ? '3. Check: headline spelled right, face matches the reference, outfit matches the video, text legible at thumbnail size (shrink to ~170px wide to test).'
      : '3. Check: headline spelled right, no people in the image, scene matches the video, text legible at thumbnail size (shrink to ~170px wide to test).',
    '4. If text is garbled, regenerate or add the headline afterwards in Canva/Photoshop. Upload as the YouTube custom thumbnail (1280x720, under 2 MB).',
  ].join('\n');

  return [header.join('\n'), [RULE, 'GEMINI PROMPT (paste exactly)', RULE, prompt].join('\n'), howTo].join('\n\n') + '\n';
}
