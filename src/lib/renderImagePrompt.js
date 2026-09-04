import { IMAGE_SPECS } from '../platformLimits.js';

const RULE = '-'.repeat(64);

function renderSizesTable() {
  const rows = IMAGE_SPECS.map((s) => `${s.label.padEnd(32)} ${s.width} x ${s.height}  (${s.ratio})`);
  return [
    RULE,
    'PER-PLATFORM IMAGE SIZES',
    RULE,
    ...rows,
    '',
    'Generate at the largest canvas you need (1600x900) and crop down for the',
    'other ratios, or — if your tool supports a per-request aspect ratio',
    '(Midjourney, Adobe Firefly, Stable Diffusion) — generate each ratio',
    'natively instead of cropping; composition holds up better than a crop.',
  ].join('\n');
}

// This tool never calls an image-generation API itself (same "no
// auto-publish" boundary as posting — see README) — it only writes a
// reviewable prompt + guidance for a human to paste into a tool of their
// choice.
function renderToolGuidance() {
  return [
    RULE,
    'WHICH AI IMAGE TOOL TO USE',
    RULE,
    "This step is manual by design — copy the prompt above into whichever",
    'tool you have access to:',
    '',
    '- Midjourney (v7+): strongest aesthetic/illustration quality for a',
    "  brand image. Append `--ar 16:9` / `--ar 4:5` / `--ar 1:1` to the",
    '  prompt to get an exact ratio per platform. Paid, Discord or web.',
    '- Adobe Firefly: commercially-safe training data (useful if this asset',
    '  might run as a paid ad later), a native aspect-ratio picker, and the',
    "  most reliable at actually omitting text when asked. Free tier available.",
    '- Stable Diffusion / SDXL or Flux (ComfyUI, Automatic1111, or a hosted',
    '  endpoint like fal.ai/Replicate): best fit if you want the image step',
    '  self-hosted like Ollama already is — exact pixel dimensions, no',
    '  subscription, but needs a decent GPU or a per-image hosted cost.',
    '- DALL-E 3 (ChatGPT Plus or OpenAI API): fastest to a clean result and',
    '  obeys "no text in image" better than most, but only outputs',
    '  1024x1024 / 1792x1024 / 1024x1792 — crop/resize to the sizes above',
    '  afterward.',
    '',
    'Generate 2-3 variations and pick the best — none of these reliably nail',
    '"no readable text" or exact brand color on the first try, so treat the',
    'first output as a draft, not a final asset.',
  ].join('\n');
}

export function renderImagePrompt({ topic, date, imagePrompt }) {
  const header = [
    `AquaRosters image prompt — ${date}`,
    `Topic: ${topic.id}${topic.headline ? ` — ${topic.headline}` : ''}`,
    '',
  ].join('\n');

  const basePrompt = [RULE, 'BASE PROMPT (from Ollama — edit before use if needed)', RULE, imagePrompt ?? ''].join('\n');

  return [header, basePrompt, renderSizesTable(), renderToolGuidance()].join('\n\n') + '\n';
}
