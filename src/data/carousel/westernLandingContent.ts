import { getOrderedWesternGalleryPaths } from '@/data/carousel/westernRouting.ts';

import { galleryData as cowboyColorDataFull } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
import { galleryData as cowboyBWData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs';
import { galleryData as westernNarrativesColorData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';
import { galleryData as westernNarrativesBWData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White.mjs';
import { galleryData as westernNAColorData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';
import { galleryData as westernNABWData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White.mjs';

export {
  cowboyColorDataFull,
  cowboyBWData,
  westernNarrativesColorData,
  westernNarrativesBWData,
  westernNAColorData,
  westernNABWData,
};

export const westernLandingGalleryDataMap: Record<string, any[]> = {
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color': cowboyColorDataFull,
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White': cowboyBWData,
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color': westernNarrativesColorData,
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White': westernNarrativesBWData,
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color': westernNAColorData,
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White': westernNABWData,
};

export function findWesternLandingImage(id: string, preferredPath: string) {
  for (const galleryPath of getOrderedWesternGalleryPaths(preferredPath)) {
    const galleryData = westernLandingGalleryDataMap[galleryPath] || [];
    const image = galleryData.find((entry: any) => entry.id === id);
    if (image) {
      return {
        img: image,
        href: `${galleryPath}/${id}`,
      };
    }
  }

  return null;
}