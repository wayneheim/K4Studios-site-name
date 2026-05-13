import { landingWestern as civilWarLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/landingstones.ts';
import { landingWestern as cowboyPortraitLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/landingstones.ts';
import { landingWestern as westernNarrativeLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/landingstones.ts';
import { landingWestern as nativeAmericanLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/landingstones.ts';
import { landingWestern as roaring20sLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/landingstones.ts';
import { landingWestern as wwiiPortraitLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/landingstones.ts';
import { landingWestern as wwiiMachineLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/landingstones.ts';
import { landingWestern as wwiiWarLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/landingstones.ts';
import { landingWestern as landscapeLocationLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/landingstones.ts';
import { landingWestern as landscapeThemeLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/landingstones.ts';
import { landingWestern as transportationLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Transportation/landingstones.ts';
import { landingWestern as miscLanding } from '@/data/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/landingstones.ts';

export type WildWestCurrentDockKey =
  | 'western-narrative-color'
  | 'western-narrative-bw'
  | 'na-portrait-color'
  | 'na-portrait-bw'
  | 'na-narrative-color'
  | 'na-narrative-bw';

type DockStone = Record<string, any>;

type BuildDockOptions = {
  currentKey: WildWestCurrentDockKey;
  currentHref?: string;
};

type DockEntry = {
  key: string;
  stone: DockStone;
};

const toAllHref = (href = '') => {
  const cleanHref = String(href).split('?')[0].replace(/\/$/, '');
  return `${cleanHref}/all`;
};

const asDockItem = (stone: DockStone, overrides: Record<string, any> = {}) => ({
  ...stone,
  ...overrides,
  href: overrides.href || stone.dockHref || toAllHref(stone.href),
  cue: overrides.current ? 'Current collection' : 'Browse collection ->',
});

const baseDockEntries: DockEntry[] = [
  ...civilWarLanding.tombstones.map((stone: DockStone, idx: number) => ({ key: `civil-war-${idx}`, stone })),
  ...roaring20sLanding.tombstones.map((stone: DockStone, idx: number) => ({ key: `roaring-20s-${idx}`, stone })),
  ...wwiiPortraitLanding.tombstones.map((stone: DockStone, idx: number) => ({ key: `wwii-portraits-${idx}`, stone })),
  ...wwiiMachineLanding.tombstones.map((stone: DockStone, idx: number) => ({ key: `wwii-machines-${idx}`, stone })),
  ...wwiiWarLanding.tombstones.map((stone: DockStone, idx: number) => ({ key: `wwii-war-${idx}`, stone })),
  ...cowboyPortraitLanding.tombstones.slice(0, 2).map((stone: DockStone, idx: number) => ({ key: `cowboy-portraits-${idx}`, stone })),
  { key: 'western-narrative-color', stone: westernNarrativeLanding.tombstones[0] },
  { key: 'western-narrative-bw', stone: westernNarrativeLanding.tombstones[1] },
  { key: 'na-portrait-color', stone: nativeAmericanLanding.tombstones[0] },
  { key: 'na-portrait-bw', stone: nativeAmericanLanding.tombstones[1] },
  { key: 'na-narrative-color', stone: nativeAmericanLanding.tombstones[2] },
  { key: 'na-narrative-bw', stone: nativeAmericanLanding.tombstones[3] },
  ...landscapeLocationLanding.tombstones.map((stone: DockStone, idx: number) => ({ key: `landscape-location-${idx}`, stone })),
  ...landscapeThemeLanding.tombstones.map((stone: DockStone, idx: number) => ({ key: `landscape-theme-${idx}`, stone })),
  ...transportationLanding.tombstones.map((stone: DockStone, idx: number) => ({ key: `transportation-${idx}`, stone })),
  ...miscLanding.tombstones.map((stone: DockStone, idx: number) => ({ key: `misc-${idx}`, stone })),
];

const getDockLabelOverride = (key: string, stone: DockStone): { title: string; subtitle?: string } | null => {
  const match = key.match(/^na-(portrait|narrative)-(color|bw)$/);
  if (match) {
    const [, sectionKey, variantKey] = match;
    const sectionLabel = sectionKey === 'portrait' ? 'Portraits' : 'Narrative Works';
    const variantLabel = variantKey === 'color' ? 'Color' : 'Black and White';

    return {
      title: `${variantLabel} Native American ${sectionLabel}`,
      subtitle: '',
    };
  }

  if (/^landscape-location-\d+$/.test(key)) {
    return {
      title: `${stone.title} Landscape Photos`,
      subtitle: '',
    };
  }

  return null;
};

export const buildWildWestAllPageDock = (options: BuildDockOptions) => {
  const { currentKey, currentHref } = options;

  const sectionDockItems = baseDockEntries.map(({ key, stone }) => {
    const isCurrent = key === currentKey;
    const labelOverride = getDockLabelOverride(key, stone) || {};
    return asDockItem(stone, {
      ...labelOverride,
      current: isCurrent,
      href: isCurrent && currentHref ? currentHref : undefined,
    });
  });

  const dockCenterIndex = sectionDockItems.findIndex((item: any) => item.current);

  return {
    sectionDockItems,
    dockCenterIndex,
  };
};
