// 1-minute video script prompt (video-script.txt). Built from the same
// short-form Ollama object as the social drafts: the topic headline is the
// video's subject, `image_prompt` is the visual direction, and hook line +
// core message + CTA are the information the script may draw on — nothing
// else, so the script can't claim more than the posts do.

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

export function buildVideoScriptPrompt({ topic, shared, video, productName = 'AquaRoster' }) {
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
- No identifiable people on screen. The Ending/CTA visual shows the brand,
  "${SITE_HOST}" and "${CONTACT_EMAIL}"; its audio names both.

OUTPUT
Return ONLY valid JSON, no markdown fences, no preamble, matching exactly —
one entry per time block above, in order (${VIDEO_SEGMENTS.length} entries):

{
  "segments": [
    { "visual": "what is on screen for this 10-second block", "audio": "the voice-over line for this block" }
  ]
}`;
}
