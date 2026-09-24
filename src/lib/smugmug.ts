const SMUGMUG_API_ORIGIN = "https://api.smugmug.com";

type SmugMugRelatedUri = string | { Uri?: string } | undefined;

type SmugMugImageSize = {
  Url?: string;
  Width?: number;
  Height?: number;
  Watermarked?: boolean;
};

export type SmugMugGalleryImage = {
  key: string;
  title: string;
  webUrl: string;
  orderUrl: string;
  thumbnailUrl: string;
  srcL: string;
  width: number;
  height: number;
  watermarked: boolean;
};

export type SmugMugPriceOption = {
  sku: string;
  productName: string;
  width: number;
  height: number;
  finish: string;
  price: number;
  currency: string;
};

export type SmugMugGalleryPage = {
  name: string;
  webUrl: string;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  images: SmugMugGalleryImage[];
  prices: SmugMugPriceOption[];
};

// Prices are shared by every image in an Expedition, so cache the single
// lookup briefly without making SmugMug price-list edits appear stale for long.
const PRICE_CACHE_TTL_MS = 60 * 1000;
const priceCache = new Map<string, { expiresAt: number; prices: SmugMugPriceOption[] }>();

function relatedUri(value: SmugMugRelatedUri) {
  return typeof value === "string" ? value : value?.Uri;
}

function requireApiKey() {
  const apiKey = import.meta.env.SMUGMUG_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("SMUGMUG_API_KEY is missing from the server environment.");
  }

  return apiKey;
}

async function smugMugRequest(uri: string, query: Record<string, string | number> = {}) {
  const url = new URL(uri, SMUGMUG_API_ORIGIN);
  url.searchParams.set("APIKey", requireApiKey());

  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, String(value));
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  const body = await response.json();

  if (!response.ok || body?.Code >= 400) {
    throw new Error(
      `SmugMug returned ${body?.Code || response.status}: ${body?.Message || "Unknown error"}`,
    );
  }

  return body;
}

function selectSize(
  details: Record<string, SmugMugImageSize> | undefined,
  preferredNames: string[],
) {
  for (const name of preferredNames) {
    const size = details?.[name];
    if (size?.Url) return size;
  }

  return undefined;
}

function finishLabel(skuTypeCode: string | undefined) {
  const rawFinish = skuTypeCode?.split("/").pop() || "standard";
  const normalized = rawFinish.replace(/-fuji$/i, "").replace(/-/g, " ");
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractPriceOptions(priceResponse: any): SmugMugPriceOption[] {
  const rawPrices = priceResponse.Response?.CatalogSkuPrice || [];
  const expansions = priceResponse.Expansions || {};

  return rawPrices.flatMap((price: any) => {
    const skuUri = relatedUri(price?.Uris?.CatalogSku);
    const sku = skuUri ? expansions[skuUri]?.CatalogSku : undefined;
    const productUri = relatedUri(sku?.Uris?.CatalogProduct);
    const product = productUri ? expansions[productUri]?.CatalogProduct : undefined;

    if (!sku?.Sku || !product?.Name || !Number.isFinite(Number(price?.Price))) {
      return [];
    }

    return [{
      sku: sku.Sku,
      productName: product.Name.replace(/\s+x\s+/i, " × "),
      width: Number(product.Width || 0),
      height: Number(product.Height || 0),
      finish: finishLabel(sku.SkuTypeCode),
      price: Number(price.Price),
      currency: price.Currency || "USD",
    }];
  }).sort((a: SmugMugPriceOption, b: SmugMugPriceOption) =>
    (a.width * a.height) - (b.width * b.height) || a.finish.localeCompare(b.finish),
  );
}

async function getGalleryPriceOptions(albumUri: string, image: any) {
  const cached = priceCache.get(albumUri);
  if (cached && cached.expiresAt > Date.now()) return cached.prices;

  const pricesUri = relatedUri(image?.Uris?.ImagePrices);
  if (!pricesUri) return [];

  const priceResponse = await smugMugRequest(pricesUri, {
    count: 100,
    _expand: "CatalogSku.CatalogProduct",
    _verbosity: 1,
  });
  const prices = extractPriceOptions(priceResponse);
  priceCache.set(albumUri, {
    expiresAt: Date.now() + PRICE_CACHE_TTL_MS,
    prices,
  });
  return prices;
}

export async function getPublicSmugMugGalleryPage({
  nickname,
  galleryPath,
  page = 1,
  pageSize = 24,
  includePrices = true,
}: {
  nickname: string;
  galleryPath: string;
  page?: number;
  pageSize?: number;
  includePrices?: boolean;
}): Promise<SmugMugGalleryPage> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));

  const lookup = await smugMugRequest(
    `/api/v2/user/${encodeURIComponent(nickname)}!urlpathlookup`,
    { urlpath: galleryPath },
  );
  const lookupAlbum = lookup.Response?.Album;
  const albumUri = lookupAlbum?.Uri || relatedUri(lookup.Response?.Node?.Uris?.Album);

  if (!albumUri) {
    throw new Error("The configured SmugMug path did not resolve to an album.");
  }

  const albumResponse = await smugMugRequest(albumUri);
  const album = albumResponse.Response?.Album;
  const albumImagesUri = relatedUri(album?.Uris?.AlbumImages);

  if (!albumImagesUri) {
    throw new Error("SmugMug did not return an image-list endpoint for this album.");
  }

  const albumTotal = Number(album?.ImageCount || 0);
  const knownPageCount = Math.max(1, Math.ceil(albumTotal / safePageSize));
  const currentPage = Math.min(safePage, knownPageCount);
  const start = (currentPage - 1) * safePageSize + 1;
  const imagesResponse = await smugMugRequest(albumImagesUri, {
    count: safePageSize,
    start,
    _expand: "ImageSizeDetails",
    _verbosity: 1,
  });
  const rawImages = imagesResponse.Response?.AlbumImage || [];
  const expansions = imagesResponse.Expansions || {};
  const total = Number(imagesResponse.Response?.Pages?.Total || albumTotal);

  const images = rawImages.flatMap((image: any, index: number) => {
    const sizeDetailsUri = relatedUri(image?.Uris?.ImageSizeDetails);
    const details = sizeDetailsUri
      ? expansions[sizeDetailsUri]?.ImageSizeDetails
      : undefined;
    const thumbnail = selectSize(details, [
      "ImageSizeMedium",
      "ImageSizeSmall",
      "ImageSizeLarge",
      "ImageSizeThumb",
    ]);
    const large = selectSize(details, [
      "ImageSizeLarge",
      "ImageSizeMedium",
      "ImageSizeSmall",
    ]);

    if (!image?.ImageKey || !thumbnail?.Url || !large?.Url || !image?.WebUri) {
      return [];
    }

    return [{
      key: image.ImageKey,
      title: image.Title?.trim() || `Echoes photograph ${start + index}`,
      webUrl: image.WebUri,
      orderUrl: `${image.WebUri.replace(/\/+$/, "")}/buy`,
      thumbnailUrl: thumbnail.Url,
      srcL: large.Url,
      width: Number(large.Width || thumbnail.Width || 1),
      height: Number(large.Height || thumbnail.Height || 1),
      watermarked: Boolean(large.Watermarked || thumbnail.Watermarked),
    }];
  });

  let prices: SmugMugPriceOption[] = [];
  if (includePrices) {
    try {
      prices = await getGalleryPriceOptions(albumUri, rawImages[0]);
    } catch (error) {
      console.warn("[SmugMug] Gallery pricing could not be loaded.", error);
    }
  }

  return {
    name: album?.Name || "SmugMug gallery",
    webUrl: album?.WebUri || "",
    total,
    page: currentPage,
    pageSize: safePageSize,
    pageCount: Math.max(1, Math.ceil(total / safePageSize)),
    images,
    prices,
  };
}
