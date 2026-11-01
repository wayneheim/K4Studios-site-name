const API_ORIGIN = "https://api.smugmug.com";
const GALLERY_PATH =
  "/Other/Photo-Shoots/North-Dakota/Echoes-of-the-West-2026-E";

const apiKey = process.env.SMUGMUG_API_KEY?.trim();

if (!apiKey) {
  throw new Error("SMUGMUG_API_KEY is not set.");
}

async function request(uri, query = {}) {
  const url = new URL(uri, API_ORIGIN);
  url.searchParams.set("APIKey", apiKey);

  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, String(value));
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`SmugMug returned ${response.status}: ${body.Message || "Unknown error"}`);
  }

  return body;
}

const lookup = await request("/api/v2/user/wayne-heim!urlpathlookup", {
  urlpath: GALLERY_PATH,
});
const lookupObject =
  lookup.Response?.Node || lookup.Response?.Album || lookup.Response?.Page;
const albumUri =
  lookup.Response?.Album?.Uri || lookupObject?.Uris?.Album?.Uri;

if (!albumUri) {
  throw new Error(
    `The gallery path resolved as ${lookup.Response?.Locator || "unknown"}, not an album.`,
  );
}

const albumResponse = await request(albumUri);
const album = albumResponse.Response?.Album;
const albumImagesUri = album?.Uris?.AlbumImages?.Uri;

if (!albumImagesUri) {
  throw new Error("The album response did not include an AlbumImages URI.");
}

const imagesResponse = await request(albumImagesUri, {
  count: 3,
  start: 1,
  _expand: "ImageSizeDetails,ImagePrices.CatalogSku.CatalogProduct",
  _verbosity: 1,
});
const images = imagesResponse.Response?.AlbumImage || [];
const firstSizeDetailsLink = images[0]?.Uris?.ImageSizeDetails;
const firstSizeDetailsUri =
  typeof firstSizeDetailsLink === "string"
    ? firstSizeDetailsLink
    : firstSizeDetailsLink?.Uri;
const firstSizeDetails = firstSizeDetailsUri
  ? imagesResponse.Expansions?.[firstSizeDetailsUri]
  : null;
const firstPricesLink = images[0]?.Uris?.ImagePrices;
const firstPricesUri =
  typeof firstPricesLink === "string" ? firstPricesLink : firstPricesLink?.Uri;
const firstPrices = firstPricesUri
  ? await request(firstPricesUri, {
      count: 10,
      _expand: "CatalogSku.CatalogProduct",
      _verbosity: 1,
    })
  : null;

console.log(
  JSON.stringify(
    {
      gallery: {
        name: album?.Name,
        uri: album?.Uri,
        webUri: album?.WebUri,
        imageCount: album?.ImageCount,
        externalEmbedding: album?.External,
      },
      page: imagesResponse.Response?.Pages,
      expansionKeys: Object.keys(imagesResponse.Expansions || {}),
      firstSizeDetails: firstSizeDetails?.Response?.ImageSizeDetails,
      firstPricePage: firstPrices?.Response?.Pages,
      firstPriceSample: firstPrices?.Response?.CatalogSkuPrice,
      firstPriceCatalog: firstPrices?.Expansions,
      sampleImages: images.map((image) => ({
        imageKey: image.ImageKey,
        title: image.Title,
        caption: image.Caption,
        webUri: image.WebUri,
        uri: image.Uri,
        uris: image.Uris,
      })),
    },
    null,
    2,
  ),
);
