// 1-minute video script prompt (video-script.txt). Built from the same
// short-form Ollama object as the social drafts: the topic headline is the
// video's subject, the selected vertical supplies the location, and hook line +
// core message + CTA support the selected topic's approved fact. Social image
// artwork is deliberately excluded: its metaphors are not physical scenes.
//
// Continuity: video models generate each 10-second block as a separate clip
// and know nothing about the others, so scene, look and voice drift. The
// model therefore writes one "bible" (fixed setting / look / camera / voice)
// and each block's `ends_on` frame; renderVideoScript repeats the bible in
// every clip prompt and starts each clip from the previous `ends_on`.

import { SITE_URL, CONTACT_EMAIL } from './seoFocus.js';
import { isProductFootage } from './videoCharacter.js';
import { videoTopicDirection } from './videoTopicDirection.js';

export const VIDEO_SEGMENTS = [
  { time: '0–10 sec', label: 'Hook' },
  { time: '10–20 sec', label: 'Introduce subject/problem' },
  { time: '20–30 sec', label: 'Main action' },
  { time: '30–40 sec', label: 'Development/demo' },
  { time: '40–50 sec', label: 'Result/payoff' },
  { time: '50–60 sec', label: 'Ending/CTA' },
];

export const SITE_HOST = SITE_URL.replace(/^https?:\/\/(www\.)?/, '');
export const VIDEO_AUDIO_MAX_WORDS = 20;
export const VIDEO_CTA_MAX_WORDS = 16;

// `character` ({ identity }) + `mode` ('character' | 'product' | 'none') come
// from videoCharacter.js. With no character the video has no people on screen.
export function buildVideoScriptPrompt({ topic, shared, video, scene = 'an activity business reception area', audience = null, productName = 'RidgeHQ', character = null, mode = 'none', claimRules = '' }) {
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
  const presenterRules = character ? presenterRulesFor({ footageBlocks, productName, character }) : '- No people on screen at all: no crew, faces, hands or silhouettes, and no action that needs a person (loading, carrying, handling) — objects are shown at rest (the cover prompt has the same rule).';
  const branding = character?.logo
    ? `the ONLY branding is the ${productName} logo, embroidered — name where (e.g. left chest, cap front, PFD shoulder); no other logos or readable text`
    : 'no logos or readable text';
  const wardrobeKey = character
    ? `,
    "wardrobe": "ONE complete outfit for the presenter, chosen to suit THIS setting, climate, weather and actual action, including appropriate safety gear for her position (name every garment, its colour and fit, footwear and accessories; ${branding}). Worn unchanged in every block",
    "cast": "Use 'None; presenter only' unless THIS topic needs a supporting person. Otherwise name each person's role, age range, distinct appearance, outfit and fixed position relative to the presenter (crew outfits: ${branding}). Same people and outfits throughout"`
    : '';
  const voiceHint = character
    ? 'the presenter\'s ONE real human speaking voice: gender, age range, accent, pitch, pace, warmth, natural breathing — e.g. warm male, 30s, neutral international English, calm conversational pace. Never robotic, synthetic or text-to-speech sounding'
    : 'the narrator: gender, age range, accent, pace, tone — e.g. warm male, 30s, neutral international English, calm measured pace';

  return `create a 1 min script

Brand: ${productName}

Website: ${SITE_HOST}

Email: ${CONTACT_EMAIL}

Visual direction

Live-action photorealism in ${scene}. Choose a plausible working area within that
location suited to the selected topic, with natural materials, skin texture,
reflections and restrained colour grading. No illustration, surreal visual
metaphors, glowing money streams, floating graphics or interface glow.
The social image prompt is a separate artwork and must not direct this film.

${VIDEO_SEGMENTS.map((s) => `${s.time} — ${s.label}`).join('\n\n')}

Topic: ${video.title}

SELECTED TOPIC (the subject of ALL six blocks)
ID: ${topic.id}
Headline: ${topic.headline}
Approved detail: ${topic.detail ?? shared.core_message}
${audience ? `Audience: ${audience}\n` : ''}
${topic.focus_angle ? `This run's angle: ${topic.focus_angle}\n` : ''}${presenterSection}

TOPIC-SPECIFIC SHOT BRIEF (scene direction only; adds no product claims)
${videoTopicDirection(topic)}

INFORMATION

${shared.hook_line}

${shared.core_message}

${shared.call_to_action}

${claimRules}

RULES
- ${statusRule}
- Use only the INFORMATION above. Never invent features, statistics, prices,
  customer quotes, or integrations.
- TOPIC LOCK: the selected topic's approved detail is the product fact for this
  film. INFORMATION is supporting draft copy, not new evidence. The CLAIM RULES
  are a permission boundary, not a checklist of features to demonstrate. Do not
  switch to another feature to fill time. Every visual, audio and ends_on must
  serve this topic; explain its context without inventing a multi-feature flow.
- CONTINUITY: this is ONE continuous 60-second film shot in ONE location, not
  six separate scenes. Every block shows the SAME setting, the SAME objects in
  the SAME positions, the SAME lighting and the SAME color palette; only the
  camera moves or one simple action happens per block. Water may ripple, moored
  boats may bob and hair may move gently in a consistent breeze. Fix the sun
  direction, shadow length, weather, exposure and white balance for the full minute.
  Never introduce a new
  location, time of day, or art style. Block N must begin exactly where
  block N-1 ended.
  In product mode only, the real screen-recording blocks are an editorial insert;
  return to the last presenter frame afterwards. They do not inherit the outdoor camera or lighting.
- VISUAL PROGRESSION: While maintaining continuity within the single setting and look,
  advance the visual story across the six blocks to match their labels (Hook establishes
  the environment -> Problem reveals the friction or operational context -> Main action
  introduces the selected fact -> Demo explains that fact without inventing UI ->
  Payoff recaps that fact without promising results -> Ending/CTA provides a clean
  closing hold for a card added in editing).
  Use at most one slow camera move and one simple gesture per block. A stable
  camera is allowed; avoid orbits, focus racks away from a speaking face and busy
  simultaneous actions. Never freeze on a single static prop for the entire film.
- NO REPEATED DIALOGUE: all six audio lines must be different, with a distinct
  narrative role (hook → context → selected fact → explanation → recap → CTA).
  Stay within the same approved fact; do not invent a new feature or benefit
  just to make each line different. Do not repeat whole sentences.
- Each visual is a full, self-contained shot description (name the setting and
  key objects again — do not say "the same" or "as before") with at most one
  camera move; a stable shot is allowed.
- All six audio lines are ONE ${character ? 'speaker' : 'narrator'} in ONE voice speaking one continuous
  script; each line flows from the previous one and the whole reads as one piece.
${presenterRules}
- The Ending/CTA visual holds the live scene with space for an editor-added card;
  do not ask the video model to render text, contact details or a floating logo.
  The editor adds the brand, "${SITE_HOST}" and "${CONTACT_EMAIL}" afterwards.
  Its audio names the website only and invites people to learn more about the topic. It adds no
  other fact: no 0% commission, no result, no new feature — the ending is not a payoff.
- REAL SCREENS ONLY: in AI-generated scenes, any device screen faces its holder
  and is unreadable to camera. Never generate product screens, readable signatures,
  checkmarks, QR codes, payment confirmations or booking links. A real demo belongs
  in product mode with producer-supplied footage; never invent its layout or states.
${topic.id === 'waiver-system' || topic.fact_id === 'feature.waivers'
    ? '- WAIVER TOPIC ONLY: if real product footage demonstrates signing, show the actual typed e-signature workflow; never handwritten finger scribbles or QR-linked waiver signing.\n'
    : ''}
- NATURAL SPEECH CADENCE: The audio script must flow naturally when read aloud by human TTS
  at 130-140 WPM. Each ten-second block has at most ${VIDEO_AUDIO_MAX_WORDS} whitespace-separated words;
  the final CTA has at most ${VIDEO_CTA_MAX_WORDS}, leaving room for pauses and a final hold.
  Do not speak the email address. The ending CTA phrases the website naturally for speech
  (e.g. "Visit ${SITE_HOST} to learn more."). Never write awkward
  literal spelled-out punctuation like "dot app" or "at Ridge HQ dot app" in the copy text.

OUTPUT
Return ONLY valid JSON, no markdown fences, no preamble, matching exactly —
a "bible" (fixed for the whole video) and one segment per time block above,
in order (${VIDEO_SEGMENTS.length} entries):

{
  "bible": {
    "setting": "the single physical location, fixed layout and prop count; if a device is needed, specify its colour, orientation and supporting hand",
    "look": "live-action photorealism, natural skin texture, restrained colour palette, fixed time of day, light direction, weather and shadows",
    "camera": "consistent lens and framing; keep a speaking face visible and in focus, with at most one slow move per block",
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

function presenterRulesFor({ footageBlocks, productName, character }) {
  const rules = [
    '- PRESENTER: the person in PRESENTER is the lead and the ONLY one speaking. ' +
      'Same face, age, build, hair and skin tone in every block — never a new or different person.',
    '- CAST: the bible\'s "cast" are the only other people on screen; no supporting people are required. ' +
      'Use distinct faces and fixed positions if the topic needs participants. Same people and outfits in every block; ' +
      'they never speak to camera and never replace the presenter. No crowd of extras beyond the cast.',
    '- HANDS-ON REALISM: people physically do things. Whenever a tablet or phone appears, a person HOLDS it in their hands ' +
      '(fix the supporting hand and use the free index finger for a single tap; no handoffs) — ' +
      'it is never left on a rock, table, bench or any other surface, and never floats. Every hand-held object (tablet, paddle, ' +
      'rope, board) keeps the same type, count and supporting hand from frame to frame. Do not force the presenter to sail, ' +
      'paddle or perform another sport while speaking about an administrative topic. Use correct safety gear for the actual position and action.',
    '- WARDROBE: the bible\'s "wardrobe" is ONE outfit suited to the setting, climate and activity, worn unchanged in ' +
      'every block (same garments, colours, fit; nothing added, removed or swapped). Name it again in every visual.',
    '- VOICE: the presenter speaks the audio line to camera, lip-synced, in the one human voice from the bible — ' +
      'natural conversational phrasing with real breath and rhythm, short sentences, contractions allowed. ' +
      'Each visual states where the presenter stands, gaze, gesture and expression for that block.',
  ];
  if (character?.logo) {
    rules.push(
      `- LOGO: a ${productName} logo image is attached to every generation. It is the only logo in the film: embroidered on the ` +
        'presenter\'s and crew\'s gear (as named in wardrobe/cast). The editor adds the original logo to the closing card afterwards. Describe it only as ' +
        `"the ${productName} logo" — never describe or invent its shapes, colours or lettering, and add no other brand marks.`,
    );
  }
  if (footageBlocks.length) {
    rules.push(
      footageRule(footageBlocks, productName),
      '  In those blocks the presenter is off-screen and the SAME voice continues as voice-over; the block after ' +
        'footage returns to the presenter in the same wardrobe, position and lighting as the last presenter frame.',
    );
  }
  return rules.join('\n');
}
