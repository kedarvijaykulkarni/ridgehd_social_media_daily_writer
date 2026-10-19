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

export const VIDEO_SEGMENTS = [
  { time: '0–10 sec', label: 'Hook' },
  { time: '10–20 sec', label: 'Introduce subject/problem' },
  { time: '20–30 sec', label: 'Main action' },
  { time: '30–40 sec', label: 'Development/demo' },
  { time: '40–50 sec', label: 'Result/payoff' },
  { time: '50–60 sec', label: 'Ending/CTA' },
];

export const SITE_HOST = SITE_URL.replace(/^https?:\/\/(www\.)?/, '');

export function buildVideoScriptPrompt({ topic, shared, video, productName = 'RidgeHQ' }) {
  const statusRule =
    topic.status === 'shipped'
      ? 'This topic is SHIPPED — the narration may describe it in the present tense.'
      : `This topic is "${topic.status}" — the narration must stay in future/roadmap framing ` +
        '("coming soon", "we\'re building"). Never present it as available today.';

  return `create a 1 min script

Brand: ${productName}

Website: ${SITE_HOST}

Email: ${CONTACT_EMAIL}

Visual direction

Use your judgement

${VIDEO_SEGMENTS.map((s) => `${s.time} — ${s.label}`).join('\n\n')}

Topic: ${video.title}

${shared.image_prompt}

INFORMATION

${shared.hook_line}

${shared.core_message}

${shared.call_to_action}

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
- Each visual is a full, self-contained shot description (name the setting and
  key objects again — do not say "the same" or "as before") with a single
  camera move.
- All six audio lines are ONE narrator in ONE voice speaking one continuous
  script; each line flows from the previous one and the whole reads as one piece.
- No identifiable people on screen. The Ending/CTA visual shows the brand,
  "${SITE_HOST}" and "${CONTACT_EMAIL}"; its audio names both.

OUTPUT
Return ONLY valid JSON, no markdown fences, no preamble, matching exactly —
a "bible" (fixed for the whole video) and one segment per time block above,
in order (${VIDEO_SEGMENTS.length} entries):

{
  "bible": {
    "setting": "the single location and its fixed objects and layout, specific enough to redraw identically",
    "look": "art style, color palette, time of day and lighting, lens look — fixed for all blocks",
    "camera": "lens, framing style and movement language used throughout",
    "voice": "the narrator: gender, age range, accent, pace, tone — e.g. warm male, 30s, neutral international English, calm measured pace"
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
