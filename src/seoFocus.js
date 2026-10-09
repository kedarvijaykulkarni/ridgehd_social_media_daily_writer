// Website focus rotation: which ridgehq.app landing page today's drafts
// point at, and which search phrases they should carry.
//
// The vault topic (loadKnowledgeBase.js) supplies the *claim*. This module
// supplies the *audience + destination*: one vertical from
// ridgehq.app/solutions (rotated) and one capability page from
// ridgehq.app/platform or /tools (rotated). Without it every draft was
// written for dive centers only and never linked a landing page.
//
// `blurb` is copied from the published page copy (checked 2026-10-09) — it
// is already-public claim text, not new claims. `keywords[0]` is the primary
// phrase; the rest are secondary. Keywords come from Google Search Console
// impressions — keep them to phrases the linked page actually serves.

export const SITE_URL = 'https://www.ridgehq.app';

// Always present on every hashtag-bearing platform and in long-form tags.
export const BRAND_HASHTAGS = ['#RidgeHQ'];
export const BRAND_KEYWORDS = ['RidgeHQ', 'activity business software'];

export const VERTICALS = [
  {
    id: 'kayak-rental-tours',
    name: 'kayak & canoe rental and tour operators',
    url: `${SITE_URL}/solutions/kayak-rental-tours`,
    keywords: [
      'kayak rental booking software',
      'kayak rental software',
      'kayak and canoe tours reservation software',
      'online booking software for kayak and canoe tours',
    ],
    hashtags: ['#KayakRental', '#Kayaking', '#Canoeing'],
    scene: 'a kayak and SUP rental dock',
    blurb:
      'One booking and operations system for kayak and SUP rentals and guided tours. Availability, payments, customer details, and the daily run stay unified from the front desk to the dock.',
  },
  {
    id: 'surf-schools',
    name: 'surf schools',
    url: `${SITE_URL}/solutions/surf-schools`,
    keywords: ['surf school software', 'surf school booking software', 'surf lesson scheduling'],
    hashtags: ['#SurfSchool', '#Surfing', '#SurfLessons'],
    scene: 'a surf school beach at sunrise',
    blurb:
      'Stop juggling spreadsheets, group chats, and last-minute changes. RidgeHQ brings bookings, tide and swell context, instructor planning, rentals, and payments into one system.',
  },
  {
    id: 'kitesurf-schools',
    name: 'kitesurf schools',
    url: `${SITE_URL}/solutions/kitesurf-schools`,
    keywords: [
      'kitesurf schools online booking system',
      'windsurfing and kitesurfing management software',
      'booking software for windsurfing and kitesurfing',
    ],
    hashtags: ['#Kitesurfing', '#KiteSchool', '#Kiteboarding'],
    scene: 'a windy kitesurf lagoon',
    blurb:
      'Generic tools do not get wind windows, last-minute reshuffles, or multi-session courses. RidgeHQ gives you online sales, wind-aware scheduling, kites tracked by size, and forms that adapt.',
  },
  {
    id: 'windsurf-schools',
    name: 'windsurf, wingfoil and SUP schools',
    url: `${SITE_URL}/solutions/windsurf-schools`,
    keywords: [
      'windsurf schools online booking system',
      'windsurfing and kitesurfing management software',
      'booking software for windsurfing and kitesurfing',
    ],
    hashtags: ['#Windsurfing', '#Wingfoil', '#WindsurfSchool'],
    scene: 'a windsurf and wingfoil rental beach',
    blurb:
      'Built for busy lesson and rental floors — windsurf, wingfoil, SUP. Sell through more channels, keep one live schedule for the whole team, and run clean check-ins without spreadsheet chaos.',
  },
  {
    id: 'dive-centers',
    name: 'dive centers and dive schools',
    url: `${SITE_URL}/solutions/dive-centers`,
    keywords: [
      'dive center software',
      'dive schools reservation software',
      'dive schools ticketing software',
      'shark diving booking software',
    ],
    hashtags: ['#DiveCenter', '#ScubaDiving', '#DiveShop'],
    scene: 'a dive boat loading tanks at a pier',
    blurb:
      'Generic booking tools do not understand boats, two-tank days, kit prep, or per-diver medicals. RidgeHQ puts dive-specific rosters, waivers, payments, and multi-channel sales in one place.',
  },
  {
    id: 'ski-schools',
    name: 'ski and snowboard schools',
    url: `${SITE_URL}/solutions/ski-schools`,
    keywords: ['ski school software', 'ski school tracking software', 'ski lesson booking software'],
    hashtags: ['#SkiSchool', '#Skiing', '#Snowboarding'],
    scene: 'a ski school meeting point on a snowy slope',
    blurb:
      'Generic tools do not handle ski and snowboard lessons, multi-day courses, meeting points, and constant last-minute changes. RidgeHQ brings bookings, scheduling, payments, and admin into one flow.',
  },
  {
    id: 'outdoor-whitewater',
    name: 'rafting, canyoning and outdoor centres',
    url: `${SITE_URL}/solutions/outdoor-whitewater`,
    keywords: ['rafting booking software', 'booking software rafting', 'outdoor activity booking software'],
    hashtags: ['#Rafting', '#Whitewater', '#Canyoning'],
    scene: 'a whitewater rafting put-in on a river',
    blurb:
      'Rafting, canyoning, and guided kayak trips move fast, sell in groups, and depend on clean logistics. RidgeHQ keeps website sales, POS, agents, payments, and participant forms connected.',
  },
  {
    id: 'sailing-schools',
    name: 'sailing schools',
    url: `${SITE_URL}/solutions/sailing-schools`,
    keywords: ['sailing school software', 'sailing school booking software'],
    hashtags: ['#SailingSchool', '#Sailing', '#LearnToSail'],
    scene: 'a sailing school fleet in a marina',
    blurb:
      'Generic booking tools struggle with summer courses, private coaching, and fleet charter at once. RidgeHQ keeps every service on one planner and one fleet so you sell across channels and keep sessions on time.',
  },
  {
    id: 'dive-resorts',
    name: 'dive resorts',
    url: `${SITE_URL}/solutions/dive-resorts`,
    keywords: ['dive resort software', 'dive resort booking software'],
    hashtags: ['#DiveResort', '#ScubaDiving', '#DiveTravel'],
    scene: 'a tropical dive resort jetty',
    blurb:
      'RidgeHQ brings website sales, on-site POS, boat operations, guest paperwork, and the daily close into one system — purpose-built for dive operations and flexible for resort stays with add-ons.',
  },
  {
    id: 'surf-camps',
    name: 'surf camps',
    url: `${SITE_URL}/solutions/surf-camps`,
    keywords: ['surf camp booking software', 'surf camp software'],
    hashtags: ['#SurfCamp', '#Surfing', '#SurfTravel'],
    scene: 'a surf camp with boards racked outside',
    blurb:
      'Beds, daily lessons, gear, and guest prep kept together. RidgeHQ sells week stays as packages with add-ons, collects deposits, captures guest details up front, and runs daily rosters without spreadsheets.',
  },
  {
    id: 'bike-rental-tours',
    name: 'bike rental and tour operators',
    url: `${SITE_URL}/solutions/bike-rental-tours`,
    keywords: ['bike rental software', 'bike tour booking software'],
    hashtags: ['#BikeRental', '#BikeTours', '#Cycling'],
    scene: 'a bike rental shop with a fleet lined up',
    blurb:
      'Stop managing rentals across paper, chat apps, and spreadsheets. RidgeHQ puts rentals, fleet availability, payments, and staff scheduling on one live calendar — for the shop floor and guided tours.',
  },
  {
    id: 'boat-rental-courses',
    name: 'boat rental and boating course operators',
    url: `${SITE_URL}/solutions/boat-rental-courses`,
    keywords: ['boat rental software', 'boat rental booking software'],
    hashtags: ['#BoatRental', '#Boating', '#BoatCharter'],
    scene: 'small rental boats moored at a harbour',
    blurb:
      'Stop juggling boat availability, course sessions, payments, and paperwork. RidgeHQ keeps charters and training in one place so you fill more dates, avoid double-bookings, and run smoother at the dock.',
  },
];

export const PLATFORM_PAGES = [
  {
    id: 'bookings-pos',
    name: 'Online Bookings & POS',
    url: `${SITE_URL}/platform/bookings-pos`,
    keywords: ['online booking software', 'booking and POS system'],
    blurb:
      'Sell without creating a second operation. Keep front-desk and online sales connected to the same operational context.',
  },
  {
    id: 'scheduling',
    name: 'Scheduling & Dispatch',
    url: `${SITE_URL}/platform/scheduling`,
    keywords: ['activity scheduling software', 'instructor scheduling'],
    blurb:
      'Plan with the full picture. See sessions, people, capacity, and resources together in one live view.',
  },
  {
    id: 'gear-rentals',
    name: 'Gear & Fleet Management',
    url: `${SITE_URL}/platform/gear-rentals`,
    keywords: ['rental management software', 'gear rental tracking'],
    blurb:
      'Rental gear down to unit and size, boats and vehicles with their inspections and paperwork: availability tracked by unit and by size, and maintenance records that take gear out of service automatically.',
  },
  {
    id: 'staff',
    name: 'Staff Coordination',
    url: `${SITE_URL}/platform/staff`,
    keywords: ['staff scheduling software', 'instructor management'],
    blurb:
      'Assign the right instructors and guides; an instructor assigned to two overlapping sessions is refused.',
  },
  {
    id: 'customers-participants',
    name: 'Customer & Participant Profiles',
    url: `${SITE_URL}/platform/customers-participants`,
    keywords: ['customer management for activity businesses', 'digital waivers'],
    blurb:
      'Know the participant behind the booking. Keep client history, waivers, and preferences attached to the workflow.',
  },
  {
    id: 'payments',
    name: 'Payments & Reporting',
    url: `${SITE_URL}/platform/payments`,
    keywords: ['payments and reporting', 'daily close reporting'],
    blurb:
      'Close the day with context. Bring deposits, final payments, operational history, and reporting together.',
  },
  {
    id: 'roi-calculator',
    name: 'free ROI Calculator',
    url: `${SITE_URL}/tools/roi-calculator`,
    keywords: ['roi analysis tool', 'ROI calculator'],
    blurb:
      'A free calculator with the formulas exposed: estimate the return on investment of a new operational system from your own cost and savings estimate. It estimates — it does not claim a guaranteed RidgeHQ saving.',
  },
];

// Least-used first (counted from post-history's `historyKey` field), then
// least-recently-used, then list order — same rule as selectTopic.js.
function pickLeastUsed(list, posts, historyKey) {
  const stats = list.map((entry, index) => {
    const uses = posts.filter((p) => p[historyKey] === entry.id);
    const last = uses.length ? Math.max(...uses.map((p) => new Date(p.date).getTime())) : -Infinity;
    return { entry, index, count: uses.length, last };
  });
  stats.sort((a, b) => a.count - b.count || a.last - b.last || a.index - b.index);
  return stats[0].entry;
}

export function selectFocus(history) {
  const posts = history.posts ?? [];
  return {
    vertical: pickLeastUsed(VERTICALS, posts, 'vertical_id'),
    platform: pickLeastUsed(PLATFORM_PAGES, posts, 'platform_id'),
  };
}

// Brand tag first, then the vertical's own tags — formatters put these ahead
// of the model's tags so trimming-to-fit removes model tags first.
export function focusHashtags(focus) {
  return [...BRAND_HASHTAGS, ...(focus?.vertical?.hashtags ?? [])];
}

// Honest post-hoc check: which focus keywords actually appear in `text`.
// Reported to the reviewer; never used to rewrite the draft.
export function keywordCoverage(text, keywords) {
  const haystack = String(text ?? '').toLowerCase();
  const found = [];
  const missing = [];
  for (const k of keywords) (haystack.includes(k.toLowerCase()) ? found : missing).push(k);
  return { found, missing };
}

// One-line positioning used in both prompts' SYSTEM block, so the model
// stops treating the product as dive-only.
export const POSITIONING =
  'the Activity Business OS — booking and operations software for activity businesses ' +
  '(dive centers, surf / kitesurf / windsurf / sailing schools, ski schools, kayak & canoe ' +
  'rentals and tours, rafting and outdoor centres, bike and boat rentals)';

// Prompt block shared by buildOllamaPrompt.js and buildArticlePrompt.js.
export function focusPromptBlock({ focus, productName, includePlatform = false }) {
  const { vertical, platform } = focus;
  const lines = [
    `TODAY'S AUDIENCE: ${vertical.name}. Speak to their day, their equipment, their`,
    `problems — not to dive centers unless that is today's audience.`,
    `- What ${productName} does for them (published website copy — safe to restate):`,
    `  ${vertical.blurb}`,
    `- If today's topic fact is specific to a different activity, keep the fact`,
    `  accurate and generalise the benefit; never invent a ${vertical.name}-specific feature.`,
    `- The landing page ${vertical.url} is appended automatically — do NOT write URLs.`,
  ];
  if (includePlatform) {
    lines.push(
      `- Capability to cover in one section: ${platform.name} — ${platform.blurb}`,
      `  (its page ${platform.url} is linked automatically).`,
    );
  }
  const secondary = [...vertical.keywords.slice(1), ...(includePlatform ? platform.keywords : [])];
  lines.push(
    '',
    'SEO KEYWORDS (from real Google searches — use them naturally, never stuffed):',
    `- Use the brand name "${productName}" at least once.`,
    `- PRIMARY phrase, use verbatim at least once: "${vertical.keywords[0]}"`,
    `- Secondary phrases, use 1–3 where they read naturally: ${secondary.map((k) => `"${k}"`).join(', ')}`,
    `- Do not include ${[...BRAND_HASHTAGS, ...vertical.hashtags].join(' ')} in your hashtag lists — they are added automatically.`,
  );
  return lines.join('\n');
}
