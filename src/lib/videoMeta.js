// YouTube title + description for the day's video. Derived from the
// short-form Ollama object so the video, its script (video-script.txt) and
// the blog post's `video:` frontmatter all carry the same copy — the website
// cross-checks the frontmatter against YouTube, so upload with exactly these.
const YOUTUBE_TITLE_MAX = 100;

export function videoMeta({ topic, shared }) {
  const headline = (topic.headline ?? '').trim();
  const title =
    headline.length > YOUTUBE_TITLE_MAX ? `${headline.slice(0, YOUTUBE_TITLE_MAX - 1).trimEnd()}…` : headline;
  const description = [shared.hook_line, shared.core_message]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return { title, description };
}
