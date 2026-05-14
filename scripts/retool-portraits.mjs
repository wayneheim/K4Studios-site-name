import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const TARGET_FILE = path.join(
  repoRoot,
  'src/data/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits.mjs',
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const WRITE_IN_PLACE = !process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number.parseInt(LIMIT_ARG.split('=')[1], 10) : Number.POSITIVE_INFINITY;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const needsRetool = (item) => {
  if (item.visibility === 'ghost') return false;
  if (FORCE) return true;

  const title = item.title?.trim() || '';
  const titleNeedsWork =
    !title ||
    title.endsWith(':') ||
    (title.includes('Fine Art Painterly Portrait Photography:') && title.endsWith(':')) ||
    title.includes('Experimental Fine Art') ||
    title.includes('Western Cowboy Art');

  const story = item.story?.trim() || '';
  const storyNeedsWork =
    !story ||
    story.includes('Painterly photography portraits by Wayne Heim.') ||
    story.includes('© Wayne Heim 2018 Painterly photography portraits') ||
    story.length < 40;

  return titleNeedsWork || storyNeedsWork;
};

const extractContext = (item) => {
  const src = item.src || '';
  const pathClues = [];

  if (src.includes('Wedding')) pathClues.push('wedding/couple');
  if (src.includes('D-Day')) pathClues.push('WWII D-Day reenactor');
  if (src.includes('Wild-West') || src.includes('Old-Bedford')) pathClues.push('Wild West western reenactor');
  if (src.includes('Kid-Pics') || src.includes('Emma') || src.includes('Ivy') || src.includes('Samantha')) {
    pathClues.push('youth portrait child');
  }
  if (src.includes('X-mas') || src.includes('Heim-Pics')) pathClues.push('family portrait');
  if (src.includes('Models-in-May')) pathClues.push('studio portrait model');
  if (src.includes('Artist-Ride') || src.includes('South-Dakota')) pathClues.push('working cowboy South Dakota');
  if (src.includes('Adventure')) pathClues.push('outdoor adventure portrait');
  if (src.includes('Hardwood')) pathClues.push('outdoor nature portrait');
  if (src.includes('Memorial')) pathClues.push('memorial adventure outdoor');

  return pathClues.join(', ') || 'fine art portrait';
};

const getKeywords = (item) => {
  const src = item.src || '';
  const base = [
    'painterly fine art photography',
    'fine art portrait photography',
    'painterly portrait print',
    'fine art portrait print',
    'Wayne Heim photography',
    'painterly photography prints',
    'fine art photography prints',
  ];

  if (src.includes('Wedding')) {
    return [...base, 'wedding fine art photography', 'bride portrait', 'couple portrait photography'];
  }
  if (src.includes('D-Day') || src.includes('Reenact')) {
    return [...base, 'wwii reenactment photography', 'historical portrait photography', 'fine art reenactment photography'];
  }
  if (src.includes('Wild-West') || src.includes('Old-Bedford')) {
    return [...base, 'western reenactment photography', 'painterly western portrait', 'wild west fine art photography', 'historically themed photography'];
  }
  if (src.includes('Kid-Pics') || src.includes('Emma') || src.includes('Ivy') || src.includes('Samantha')) {
    return [...base, 'painterly youth portrait', 'fine art child portrait photography'];
  }
  if (src.includes('X-mas') || src.includes('Heim-Pics')) {
    return [...base, 'painterly family portrait', 'fine art family photography'];
  }
  if (src.includes('Artist-Ride') || src.includes('South-Dakota')) {
    return [...base, 'working cowboy photography', 'western cowboy portrait', 'painterly cowboy photography'];
  }

  return [...base, 'Rembrandt portrait photography', 'painterly fine art portrait', 'fine art portrait print'];
};

const parseAnthropicJson = (data) => {
  const text = data?.content?.find((part) => part.type === 'text')?.text?.trim();
  if (!text) throw new Error('Anthropic response did not contain text content');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Anthropic response was not JSON: ${text}`);

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.title || !parsed.story) throw new Error(`Missing title/story in response: ${text}`);
  return {
    title: parsed.title.trim().replace(/\s+/g, ' '),
    story: parsed.story.trim(),
  };
};

const titleCase = (value) => {
  const lowerWords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'the', 'to', 'with']);
  return value
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && lowerWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
};

const inferSubject = (item) => {
  const context = extractContext(item);
  const description = item.description || '';
  if (context.includes('wedding')) return 'bride';
  if (context.includes('WWII')) return 'reenactor';
  if (context.includes('Wild West')) return 'western reenactor';
  if (context.includes('youth')) return 'young subject';
  if (context.includes('family')) return 'family';
  if (context.includes('cowboy')) return 'cowboy';
  if (context.includes('outdoor')) return 'outdoor figure';
  if (description.includes('sleeping figure')) return 'sleeping figure';
  if (description.includes('senior portrait')) return 'senior portrait';
  if (description.includes('historical reenactor')) return 'historical reenactor';
  return 'portrait subject';
};

const overusedTitles = new Set([
  'A Steady Presence',
  'The Quiet Gaze',
  'Interior Weather',
  'Held in Light',
  'Fine Art Experimental Fine Art',
  'Capturing Experimental Fine Art',
  'Exploring Experimental Fine Art',
  'Rugged Spirit And Western Cowboy Art',
  'A Childs Reverie',
]);

const localTitlePool = {
  bride: ['Veil and Stillness', 'Promise Held Quietly', 'Before the Vows', 'Light on the Bride', 'Grace Before the Door'],
  reenactor: ['Waiting for Orders', 'The Young Watch', 'Orders in the Air', 'Before the Landing', 'The Daylight Watch'],
  'western reenactor': [
    'Dust and Resolve',
    'The Quiet Frontier',
    'At the Boardwalk',
    'Western Watch',
    'Old Bedford Vigil',
    'The Saloon Door',
    'Frontier Composure',
    'After the Gun Smoke',
    'The Long Street',
    'Against the Weather',
    'A Frontier Pause',
    'The Unspoken West',
    'Under Old Timber',
    'Still at Sundown',
    'The Hard Light',
    'Dust Before Dusk',
    'A Town Held Quiet',
    'The Frontier Stare',
    'Noon at Bedford',
    'Between Doors',
    'The Kept Watch',
    'Weathered and Waiting',
  ],
  'young subject': [
    'Small Brave Moment',
    'Stillness of Youth',
    'A Young Light',
    'Quiet Before Wonder',
    'The Tender Threshold',
    'First Quiet Courage',
    "A Child's Reverie",
    'Soft Morning Resolve',
  ],
  family: [
    'What We Carry',
    'Kinship in Winter',
    'Held Together',
    'Family Light',
    'The Ones Beside Us',
    'A Season Together',
    'The Warm Room',
  ],
  cowboy: ['Rugged Spirit', 'South Dakota Resolve', 'Under the Wide Sky', 'Weathered Authority', 'The Working Horizon'],
  'outdoor figure': ['The Open Air', 'Memory on the Trail', 'Quiet Field Light', 'Beyond the Path', 'Where the Path Opens'],
  'sleeping figure': ['In the Enchanted Wood', 'Dreaming in Green', 'The Quiet Dream'],
  'senior portrait': ['Grace in the Trees', 'The Senior Year', 'A Steady Light'],
  'historical reenactor': ['Waiting for Orders', 'History in Her Hands', 'The Young Sentinel', 'The Field Waits'],
  'portrait subject': [
    'The Lamp of Stillness',
    'A Private Weather',
    'The Inward Hour',
    'Composed in Shadow',
    'The Weight of Quiet',
    'A Measured Gaze',
    'Held by Silence',
    'The Unsaid Moment',
    'Where Light Remains',
    'An Interior Flame',
    'The Patient Face',
    'Before the Answer',
    'Inward and Unbroken',
    'The Quiet Reckoning',
    'A Grace Reserved',
    'Beneath the Surface',
    'The Long Look',
    'Stillness With Teeth',
    'A Window of Thought',
    'The Resting Resolve',
    'A Still Authority',
    'Quiet Under Glass',
    'The Human Distance',
    'A Portrait of Nerve',
    'The Soft Defiance',
    'Light Across the Face',
    'The Thought Held Back',
    'A Room of Silence',
    'The Edge of Knowing',
    'A Calm Unbroken',
    'The Watchful Heart',
    'A Shadowed Grace',
    'The Moment Kept',
    'The Quiet Proof',
    'A Face in Time',
    'The Low Light',
    'A Breath of Resolve',
    'The Honest Stillness',
    'A Presence Remembered',
    'The Looking Silence',
  ],
};

const sceneLines = {
  bride: [
    'The bride stands in a hush of light, held between anticipation and memory.',
    'White fabric, soft shadow, and a steady posture turn the wedding moment inward.',
  ],
  reenactor: [
    'A young reenactor holds her place with the discipline of someone listening for what comes next.',
    'The uniform and the waiting face draw the past close without making a spectacle of it.',
  ],
  'western reenactor': [
    'A western figure meets the lens with a calm shaped by dust, daylight, and long memory.',
    'Old boards, hard light, and a guarded expression give the frontier its human weight.',
    'The West arrives here as posture and patience, not noise.',
  ],
  'young subject': [
    'A young face rests in soft light, open to the world and already carrying a private story.',
    'The portrait holds childhood at the edge of thought, tender but not fragile.',
  ],
  family: [
    'The family gathers close, their faces held together by warmth, history, and the simple fact of belonging.',
    'This is a portrait of nearness, the kind of bond that outlasts the season around it.',
  ],
  cowboy: [
    'A western figure stands with the grit of open country in his posture and the weather of experience in his face.',
    'The working West feels close here, shaped by distance, labor, and a long horizon.',
  ],
  'outdoor figure': [
    'An outdoor portrait settles into natural light, where the figure feels both present and carried by the landscape.',
    'The open air gives the portrait room to breathe, and memory seems to move through it.',
  ],
  'sleeping figure': [
    'A sleeping figure rests as if the woods have lowered their voice around her.',
    'The scene feels half dream and half shelter, with the figure folded into the quiet.',
  ],
  'senior portrait': [
    'A senior portrait stands in open light, poised at the edge of one season and the beginning of another.',
    'The face carries confidence and change in the same breath.',
  ],
  'historical reenactor': [
    'A historical reenactor holds still beneath the pressure of an imagined past.',
    'The moment is quiet, but the silence has weight, as if orders might arrive at any second.',
  ],
  'portrait subject': [
    'The figure sits inside a pocket of light, composed and inward, giving away only what the moment allows.',
    'A face, a posture, and a narrow fall of light become enough to suggest a life beyond the frame.',
    'The portrait is built from restraint, where the smallest turn of expression carries the story.',
  ],
};

const emotionLines = {
  vigilance: 'There is watchfulness in the stillness, a sense of someone measuring the room before speaking.',
  restraint: 'The quiet is deliberate, allowing the human presence to gather force slowly.',
  resolve: 'What remains is resolve, held close and made visible through stillness.',
  aftermath: 'It feels like the moment after the story has turned, when memory is still settling.',
  reflection: 'The mood turns inward, asking the viewer to linger with what is unsaid.',
  authority: 'The presence is calm but unmistakable, earned through composure rather than display.',
  endurance: 'There is endurance in the posture, a strength that does not need to announce itself.',
  consequence: 'The portrait carries consequence gently, as if every choice has left a trace in the light.',
  presence: 'The figure remains quietly present, grounded by light and silence.',
};

const chooseUnusedTitle = (pool, preferredIndex, usedTitles) => {
  for (let offset = 0; offset < pool.length; offset += 1) {
    const title = titleCase(pool[(preferredIndex + offset) % pool.length]).replace(/\.$/, '');
    if (!usedTitles.has(title)) return title;
  }
  return `${titleCase(pool[preferredIndex % pool.length]).replace(/\.$/, '')} ${usedTitles.size + 1}`;
};

const generateLocalTitleAndStory = (item, localIndex = 0, usedTitles = new Set()) => {
  const subject = inferSubject(item);
  const pool = localTitlePool[subject] || localTitlePool['portrait subject'];
  const numericSeed = [...item.id].reduce((total, char) => total + char.charCodeAt(0), 0);
  const currentTitle = item.title
    ?.replace('Fine Art Painterly Portrait Photography:', '')
    .replace(/photograph(?:y)?\s+by\s+wayne\s+heim/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .trim();
  const keepCurrent =
    currentTitle &&
    !currentTitle.endsWith(':') &&
    !overusedTitles.has(item.title?.trim()) &&
    !overusedTitles.has(currentTitle) &&
    !usedTitles.has(titleCase(currentTitle));
  const title = keepCurrent
    ? titleCase(currentTitle.replace(/\s+/g, ' '))
    : chooseUnusedTitle(pool, numericSeed + localIndex, usedTitles);
  const description = item.description || '';
  const emotionMatch = description.match(/defined by (\w+) rather than/);
  const emotion = emotionMatch ? emotionMatch[1] : 'presence';
  const scenes = sceneLines[subject] || sceneLines['portrait subject'];
  const scene = scenes[(numericSeed + localIndex) % scenes.length];
  const close = emotionLines[emotion] || emotionLines.presence;

  return {
    title,
    story: `${scene} ${close} © Wayne Heim`,
  };
};

const generateTitleAndStory = async (item, localIndex = 0, usedTitles = new Set()) => {
  if (!ANTHROPIC_API_KEY) {
    return generateLocalTitleAndStory(item, localIndex, usedTitles);
  }

  const context = extractContext(item);
  const description = item.description || '';
  const emotionMatch = description.match(/defined by (\w+) rather than/);
  const emotion = emotionMatch ? emotionMatch[1] : 'presence';

  const prompt = `You are writing metadata for a fine art photography gallery.

Image context clues: ${context}
Emotional quality: defined by ${emotion}
Current alt text: ${item.alt || ''}
Current story: ${item.story || ''}
Image ID: ${item.id}

Generate:
1. A SHORT evocative title (3-6 words, no colon, no "Fine Art Painterly Portrait Photography") that fits the subject. Examples of good titles from this collection: "Waiting for their return", "Rugged Spirit", "Behold", "Big Red". Make it specific to the subject context.
2. A story excerpt (2-3 sentences, written in Wayne Heim's voice - painterly, atmospheric, restrained). Should describe what the viewer sees and feels, not describe the photography process.

Respond ONLY in this exact JSON format, no other text:
{
  "title": "Your Title Here",
  "story": "Your story excerpt here."
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Anthropic returned HTTP ${response.status}`);
  }

  return parseAnthropicJson(data);
};

const run = async () => {
  const moduleUrl = `${pathToFileURL(TARGET_FILE).href}?t=${Date.now()}`;
  const { galleryData } = await import(moduleUrl);

  console.log(`Processing ${galleryData.length} portraits from ${path.relative(repoRoot, TARGET_FILE)}...`);
  if (!ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY not found; using local title/story fallback.');
  }

  const updatedData = [];
  let retooledCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const localCounts = new Map();
  const usedTitles = new Set(galleryData.filter((item) => item.visibility === 'ghost').map((item) => item.title));

  for (const item of galleryData) {
    const underLimit = retooledCount < LIMIT;
    if (!needsRetool(item) || !underLimit) {
      updatedData.push(item);
      skippedCount++;
      console.log(`Kept: ${item.id} - "${item.title}"`);
      continue;
    }

    console.log(`Retooling: ${item.id}...`);

    try {
      const subject = inferSubject(item);
      const localIndex = localCounts.get(subject) || 0;
      localCounts.set(subject, localIndex + 1);
      const generated = await generateTitleAndStory(item, localIndex, usedTitles);
      usedTitles.add(generated.title);
      updatedData.push({
        ...item,
        title: generated.title,
        story: generated.story,
        keywords: getKeywords(item),
        rating: item.rating === 0 ? 3 : item.rating,
        alt: generated.title,
      });
      retooledCount++;
      console.log(`Retooled: ${item.id} - "${generated.title}"`);
    } catch (err) {
      updatedData.push(item);
      failedCount++;
      console.error(`Failed on ${item.id}: ${err.message}`);
    }

    await sleep(500);
  }

  const header = WRITE_IN_PLACE
    ? `// Retooled by scripts/retool-portraits.mjs - ${new Date().toISOString()}`
    : `// Dry-run output from scripts/retool-portraits.mjs - ${new Date().toISOString()}`;
  const output = `${header}\nexport const galleryData = ${JSON.stringify(updatedData, null, 2)};\n`;
  const outputFile = WRITE_IN_PLACE
    ? TARGET_FILE
    : path.join(repoRoot, 'gallery-data-retooled.js');

  fs.writeFileSync(outputFile, output, 'utf8');

  console.log('\nDone.');
  console.log(`Retooled: ${retooledCount}`);
  console.log(`Kept as-is: ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Output: ${path.relative(repoRoot, outputFile)}`);
};

run().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
