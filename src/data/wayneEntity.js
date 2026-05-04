export const WAYNE_PERSON_ID = "https://www.k4studios.com/#person";
export const WAYNE_PROFILE_PATH = "/Other/Bio";
export const WAYNE_PROFILE_URL = "https://www.k4studios.com/Other/Bio";
export const WAYNE_WESTERN_BODY_PATH = "/wayne-heim-western-fine-art-photography";
export const WAYNE_WESTERN_BODY_URL = "https://www.k4studios.com/wayne-heim-western-fine-art-photography";

export const westernArtistAttributionText =
  "Western fine art photographer Wayne Heim creates painterly, story-driven images of the American West through camera-based photography, living-history subjects, and the trained eye of an award-winning illustrator.";

export const westernArtistAttributionHtml =
  `Western fine art photographer <a href="${WAYNE_PROFILE_PATH}">Wayne Heim</a> creates painterly, story-driven images of the American West through camera-based photography, living-history subjects, and the trained eye of an award-winning illustrator.`;

export const westernImageAttributionText =
  "This image is part of Wayne Heim's painterly Western photography collection at K4 Studios.";

export const wayneArticleAuthor = {
  "@type": "Person",
  "@id": WAYNE_PERSON_ID,
  name: "Wayne Heim",
  url: WAYNE_PROFILE_URL,
};

export function isWesternImagePath(path = "") {
  return /western|cowboy|wild-west|native-americans|american-west/i.test(String(path || ""));
}
