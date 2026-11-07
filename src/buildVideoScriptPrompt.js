// 1-minute video script prompt (video-script.txt). Built from the same
// short-form Ollama object as the social drafts: the topic headline is the
// video's subject, `image_prompt` is the visual direction, and hook line +
// core message + CTA are the information the script may draw on — nothing
// else, so the script can't claim more than the posts do.
//
// Continuity: video models generate each 10-second block as a separate clip
// and know nothing about the others, so scene, look and voice drift. The
// model therefore writes one "bible" (fixed setting / look / camera / voice)
// and each block's `ends_on` frame; renderVideoScript repeats the bible in
// every clip prompt and starts each clip from the previous `ends_on`.

import { SITE_URL, CONTACT_EMAIL } from './seoFocus.js';
import { isProductFootage } from './videoCharacter.js';

export const VIDEO_SEGMENTS = [
  { time: '0–10 sec', label: 'Hook' },
  { time: '10–20 sec', label: 'Introduce subject/problem' },
  { time: '20–30 sec', label: 'Main action' },
  { time: '30–40 sec', label: 'Development/demo' },
  { time: '40–50 sec', label: 'Result/payoff' },
  { time: '50–60 sec', label: 'Ending/CTA' },
];

export const SITE_HOST = SITE_URL.replace(/^https?:\/\/(www\.)?/, '');

// `character` ({ identity }) + `mode` ('character' | 'product' | 'none') come
// from videoCharacter.js. With no character the video has no people on screen.
export function buildVideoScriptPrompt({ topic, shared, video, productName = 'RidgeHQ', character = null, mode = 'none', claimRules = '' }) {
  const statusRule =
    topic.status === 'shipped'
      ? 'This topic is SHIPPED — the narration may describe it in the present tense.'
      : `This topic is "${topic.status}" — the narration must stay in future/roadmap framing ` +
        '("coming soon", "we\'re building"). Never present it as available today.';

  const footageBlocks = VIDEO_SEGMENTS.map((s, i) => ({ s, i })).filter(({ i }) => isProductFootage(mode, i));
  const presenterSection = character
    ? `

PRESENTER (fixed identity — copy nothing from it into the bible, it is added for you)
${character.identity}
`
    : '';
  // Product footage needs a presenter (resolveVisualMode enforces it), so the
  // no-character prompt is always the original no-people one.
  const presenterRules = character ? presenterRulesFor({ footageBlocks, productName }) : '- No identifiable people on screen.';
  const wardrobeKey = character
    ? `,
    "wardrobe": "ONE complete outfit for the presenter, chosen to suit THIS setting, climate, weather and activity (name every garment, its colour and fit, footwear and accessories; no logos or readable text). Worn unchanged in every block"`
    : '';
  const voiceHint = character
    ? 'the presenter\'s ONE real human speaking voice: gender, age range, accent, pitch, pace, warmth, natural breathing — e.g. warm male, 30s, neutral international English, calm conversational pace. Never robotic, synthetic or text-to-speech sounding'
    : 'the narrator: gender, age range, accent, pace, tone — e.g. warm male, 30s, neutral international English, calm measured pace';

  return `create a 1 min script

Brand: ${productName}

Website: ${SITE_HOST}

Email: ${CONTACT_EMAIL}

Visual direction

Use your judgement

${VIDEO_SEGMENTS.map((s) => `${s.time} — ${s.label}`).join('\n\n')}

Topic: ${video.title}

${shared.image_prompt}${presenterSection}

INFORMATION

${shared.hook_line}

${shared.core_message}

${shared.call_to_action}

${claimRules}

RULES
- ${statusRule}
- Use only the INFORMATION above. Never invent features, statistics, prices,
  customer quotes, or integrations.
- CONTINUITY: this is ONE continuous 60-second film shot in ONE location, not
  six separate scenes. Every block shows the SAME setting, the SAME objects in
  the SAME positions, the SAME lighting and the SAME color palette; only the
  camera moves or one element changes per block. Never introduce a new
  location, time of day, or art style. Block N must begin exactly where
  block N-1 ended.
- NO REPEATED DIALOGUE: all six audio lines must be different. Never copy,
  reuse or lightly reword a line from another block — each one adds a NEW point
  (hook → problem → what it does → how it helps → payoff → CTA), and no phrase
  or sentence appears twice in the whole script.
- Each visual is a full, self-contained shot description (name the setting and
  key objects again — do not say "the same" or "as before") with a single
  camera move.
- All six audio lines are ONE ${character ? 'speaker' : 'narrator'} in ONE voice speaking one continuous
  script; each line flows from the previous one and the whole reads as one piece.
${presenterRules}
- The Ending/CTA visual shows the brand, "${SITE_HOST}" and "${CONTACT_EMAIL}";
  its audio names both.

OUTPUT
Return ONLY valid JSON, no markdown fences, no preamble, matching exactly —
a "bible" (fixed for the whole video) and one segment per time block above,
in order (${VIDEO_SEGMENTS.length} entries):

{
  "bible": {
    "setting": "the single location and its fixed objects and layout, specific enough to redraw identically",
    "look": "art style, color palette, time of day and lighting, lens look — fixed for all blocks",
    "camera": "lens, framing style and movement language used throughout",
    "voice": "${voiceHint}"${wardrobeKey}
  },
  "segments": [
    {
      "visual": "full shot description for this 10-second block, in the bible's setting and look",
      "audio": "the voice-over line for this block",
      "ends_on": "the exact final frame of this block (what is in frame, where the camera is) — the next block starts from it"
    }
  ]
}`;
}

function footageList(footageBlocks) {
  return footageBlocks.map(({ s }) => `"${s.time} — ${s.label}"`).join(', ');
}

// Product footage is the user's real screen recording. The model must not
// invent what the UI looks like (CLAUDE.md rule 4 — claims come from the vault).
// validateVideoScriptShape enforces the prefix and the no-quotes/no-numbers ban.
export const footagePrefix = (productName) => `Screen recording of the real ${productName} product:`;

function footageRule(footageBlocks, productName) {
  return (
    `- PRODUCT FOOTAGE blocks (${footageList(footageBlocks)}): the visual is a real screen recording of ` +
    `${productName} that the producer supplies — begin it with "${footagePrefix(productName)}" ` +
    'and describe only which area of the product to show, in plain words the INFORMATION supports (e.g. the booking calendar, the staff roster). ' +
    'No quoted UI text, no digits, numbers, prices or percentages, no invented screens; never ask for the UI to be AI-generated.'
  );
}

function presenterRulesFor({ footageBlocks, productName }) {
  const rules = [
    '- PRESENTER: the person in PRESENTER is the ONLY person on screen and is the one speaking. ' +
      'Same face, age, build, hair and skin tone in every block — never a new or different person, no crowd of extras.',
    '- WARDROBE: the bible\'s "wardrobe" is ONE outfit suited to the setting, climate and activity, worn unchanged in ' +
      'every block (same garments, colours, fit; nothing added, removed or swapped). Name it again in every visual.',
    '- VOICE: the presenter speaks the audio line to camera, lip-synced, in the one human voice from the bible — ' +
      'natural conversational phrasing with real breath and rhythm, short sentences, contractions allowed. ' +
      'Each visual states where the presenter stands, gaze, gesture and expression for that block.',
  ];
  if (footageBlocks.length) {
    rules.push(
      footageRule(footageBlocks, productName),
      '  In those blocks the presenter is off-screen and the SAME voice continues as voice-over; the block after ' +
        'footage returns to the presenter in the same wardrobe, position and lighting as the last presenter frame.',
    );
  }
  return rules.join('\n');
}
