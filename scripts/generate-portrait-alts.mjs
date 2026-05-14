// No-API portrait alt text generator.
// Builds visual alt text from image paths, titles, and subject metadata without abstract emotion words.
import fs from 'node:fs';
import path from 'node:path';

const INPUT_FILE = path.resolve('src/data/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits.mjs');

const parseGalleryData = (raw) => {
  const match = raw.match(/export const galleryData = (\[[\s\S]*\]);/);
  if (!match) throw new Error('Could not parse galleryData');
  return JSON.parse(match[1]);
};

const extractDescriptionSubject = (item) => {
  const match = (item.description || '').match(/A painterly fine art photograph of (?:an?|the)?\s*([^,]+)/i);
  return match ? match[1].trim() : 'portrait subject';
};

const getContext = (item) => {
  const src = item.src || '';
  const subject = extractDescriptionSubject(item);

  if (src.includes('Deb-and-Cody-Wedding')) {
    return {
      subject: 'bride',
      setting: 'wedding portrait setting',
      detail: 'in a wedding dress',
      keywords: ['wedding', 'bride'],
    };
  }

  if (src.includes('D-Day')) {
    return {
      subject: 'WWII reenactor',
      setting: 'D-Day reenactment setting',
      detail: 'in period uniform',
      keywords: ['wwii', 'reenactor'],
    };
  }

  if (src.includes('Wild-West') || src.includes('OBV-Wild-West') || src.includes('Old-Bedford')) {
    return {
      subject: subject.includes('1880s') ? '1880s frontier woman' : 'western reenactor',
      setting: 'Old Bedford Village historic setting',
      detail: 'in period western clothing',
      keywords: ['western', 'reenactor'],
    };
  }

  if (src.includes('X-mas') || src.includes('Heim-Pics')) {
    return {
      subject: 'family group',
      setting: 'indoor holiday portrait setting',
      detail: 'warmly gathered',
      keywords: ['family'],
    };
  }

  if (src.includes('Kid-Pics') || src.includes('Emma') || src.includes('Ivy') || src.includes('Samantha')) {
    return {
      subject: 'young subject',
      setting: 'portrait session',
      detail: 'in soft portrait light',
      keywords: ['youth'],
    };
  }

  if (src.includes('Artist-Ride') || src.includes('South-Dakota')) {
    return {
      subject: 'western figure',
      setting: 'South Dakota outdoor western setting',
      detail: 'in rugged western light',
      keywords: ['cowboy', 'western'],
    };
  }

  if (src.includes('Hardwood') || src.includes('West-Virginia')) {
    return {
      subject: subject.includes('senior') ? 'senior portrait subject' : 'outdoor portrait subject',
      setting: 'West Virginia woodland setting',
      detail: 'in natural outdoor light',
      keywords: ['outdoor'],
    };
  }

  if (src.includes('Memorial-Adventure') || src.includes('Adventure-2023')) {
    return {
      subject: 'outdoor portrait figure',
      setting: 'natural field setting',
      detail: 'in open outdoor light',
      keywords: ['outdoor'],
    };
  }

  if (src.includes('Models-in-May')) {
    return {
      subject: subject.includes('sleeping') ? 'sleeping woman' : 'studio portrait subject',
      setting: 'studio portrait setting',
      detail: 'in soft dramatic light',
      keywords: ['studio'],
    };
  }

  return {
    subject,
    setting: 'dark studio portrait setting',
    detail: 'with painterly side lighting',
    keywords: ['studio'],
  };
};

const hasColorCue = (item) => {
  const src = item.src || '';
  if (src.includes('Black-White') || src.includes('/BW/') || src.includes('Black-and-White')) return 'black and white';
  return 'color';
};

const buildAlt = (item) => {
  const context = getContext(item);
  const color = hasColorCue(item);
  const style = color === 'black and white' ? 'black and white painterly fine art portrait' : 'painterly fine art portrait';

  if (context.keywords.includes('family')) {
    return `${style} of a family group warmly gathered in an indoor holiday setting by Wayne Heim`;
  }

  if (context.keywords.includes('wedding')) {
    return `${style} of a bride in a wedding dress with soft painterly light by Wayne Heim`;
  }

  if (context.keywords.includes('wwii')) {
    return `${style} of a WWII reenactor in period uniform at a D-Day reenactment by Wayne Heim`;
  }

  if (context.keywords.includes('youth')) {
    return `${style} of a young subject in soft portrait light during a studio session by Wayne Heim`;
  }

  if (context.keywords.includes('cowboy')) {
    return `${style} of a western figure in outdoor South Dakota western light by Wayne Heim`;
  }

  if (context.keywords.includes('western')) {
    const article = context.subject.startsWith('1880s') ? 'an' : 'a';
    return `${style} of ${article} ${context.subject} in period clothing at Old Bedford Village by Wayne Heim`;
  }

  if (context.keywords.includes('outdoor')) {
    return `${style} of ${context.subject.startsWith('outdoor') ? 'an' : 'a'} ${context.subject} in natural outdoor light by Wayne Heim`;
  }

  if (context.subject === 'sleeping woman') {
    return `${style} of a sleeping woman in soft dramatic studio light by Wayne Heim`;
  }

  return `${style} of a ${context.subject} in a dark studio setting with painterly side lighting by Wayne Heim`
    .replace(/\s+/g, ' ')
    .replace('with with ', 'with ')
    .replace('in in ', 'in ')
    .replace('of a 1880s', 'of an 1880s')
    .replace('of a outdoor', 'of an outdoor')
    .replace('with warmly gathered', 'warmly gathered')
    .replace('with a wedding dress', 'in a wedding dress')
    .trim();
};

const raw = fs.readFileSync(INPUT_FILE, 'utf8');
const galleryData = parseGalleryData(raw);

let updated = 0;
let skipped = 0;

const updatedData = galleryData.map((item) => {
  if (item.visibility === 'ghost' || !item.src || item.src.includes('placeholder')) {
    skipped += 1;
    return item;
  }

  const alt = buildAlt(item);
  updated += 1;
  console.log(`${item.id} "${item.title}"`);
  console.log(`  -> ${alt}`);
  return { ...item, alt };
});

const output =
  `// Alt text improved by scripts/generate-portrait-alts.mjs - ${new Date().toISOString()}\n` +
  `export const galleryData = ${JSON.stringify(updatedData, null, 2)};\n`;

fs.writeFileSync(INPUT_FILE, output, 'utf8');

console.log('-'.repeat(60));
console.log(`Done. Updated: ${updated} Skipped: ${skipped}`);
console.log(`Output: ${INPUT_FILE}`);
