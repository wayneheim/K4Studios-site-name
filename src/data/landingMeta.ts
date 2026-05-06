type LandingMetaEntry = {
  title?: string;
  seoTitle?: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  keywords?: string;
  descriptionMaxLength?: number;
};

export const landingMetaDB: Record<string, LandingMetaEntry> = {
  "/": {
    title: "Wayne Heim – Western & Painterly Fine Art Photography",
    seoTitle: "Wayne Heim – Western & Painterly Fine Art Photography",
    ogTitle: "Wayne Heim – Western & Painterly Fine Art Photography",
    ogDescription:
      "Painterly and traditional fine art photography by Wayne Heim, featuring Western stories, historical portraits, landscapes, and narrative collector prints.",
    ogImage: "/og/painterly.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Wayne Heim – Western & Painterly Fine Art Photography",
    twitterDescription:
      "Painterly and traditional fine art photography by Wayne Heim, featuring Western stories, historical portraits, landscapes, and narrative collector prints.",
    twitterImage: "/og/painterly.jpg",
    keywords: "Wayne Heim, Western fine art photography, painterly photography, cowboy portraits, fine art prints, Western art, historical photography, K4 Studios",
  },

  "/index": {
    title: "Wayne Heim – Western & Painterly Fine Art Photography",
    seoTitle: "Wayne Heim – Western & Painterly Fine Art Photography",
    ogTitle: "Wayne Heim – Western & Painterly Fine Art Photography",
    ogDescription:
      "Painterly and traditional fine art photography by Wayne Heim, featuring Western stories, historical portraits, landscapes, and narrative collector prints.",
    ogImage: "/og/painterly.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Wayne Heim – Western & Painterly Fine Art Photography",
    twitterDescription:
      "Painterly and traditional fine art photography by Wayne Heim, featuring Western stories, historical portraits, landscapes, and narrative collector prints.",
    twitterImage: "/og/painterly.jpg",
    keywords: "Wayne Heim, Western fine art photography, painterly photography, cowboy portraits, fine art prints, Western art, historical photography, K4 Studios",
  },

  "/Contact": {
    ogTitle: "Contact Wayne Heim – Fine Art Photographer",
    ogDescription:
      "Contact Wayne Heim for fine art photography commissions, collector print inquiries, exhibitions, and collaborations.",
    ogImage: "/og/contact.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Contact Wayne Heim – Fine Art Photographer",
    twitterDescription:
      "Reach out to Wayne Heim for commissions, collector prints, and fine art photography inquiries.",
    twitterImage: "/og/contact.jpg",
  },

  "/Other/Bio": {
    ogTitle: "About Wayne Heim – Fine Art Photographer",
    ogDescription:
      "Discover the artist behind painterly western, historical, and landscape fine art photography. Explore Wayne Heim’s artistic journey and storytelling philosophy.",
    ogImage: "/og/bio.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "About Wayne Heim – Fine Art Photographer",
    twitterDescription:
      "Explore Wayne Heim’s work in painterly western, historical, and landscape fine art photography.",
    twitterImage: "/og/bio.jpg",
  },

  "/News-Awards": {
    ogTitle: "News & Awards – Wayne Heim Fine Art Photography",
    ogDescription:
      "Explore exhibitions, awards, publications, and recent features highlighting Wayne Heim’s western and historical fine art photography.",
    ogImage: "/og/news-awards.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "News & Awards – Wayne Heim",
    twitterDescription:
      "Latest awards, exhibitions, and media features for Wayne Heim’s fine art photography.",
    twitterImage: "/og/news-awards.jpg",
  },

  "/Other/Print-Options": {
    ogTitle: "Print Options – Museum-Quality Fine Art Photography",
    ogDescription:
      "Discover museum-quality print options for Wayne Heim's fine art photography—archival paper, Baltic birch wood prints, engraving textures, and premium collector finishes.",
    ogImage: "/og/print-options.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Print Options – Wayne Heim",
    twitterDescription:
      "Explore fine art print options for collector-grade photography by Wayne Heim.",
    twitterImage: "/og/print-options.jpg",
  },

  "/Other/One-Image-Movie": {
    ogTitle: "What Is a One-Image Movie? – Fine Art Storytelling by Wayne Heim",
    ogDescription:
      "A One-Image Movie is a single photograph constructed to function as a complete narrative moment—suggesting a beginning, middle, and end within one frame.",
    ogImage: "/og/one-image-movie.jpg",
    ogType: "article",
    twitterCard: "summary_large_image",
    twitterTitle: "What Is a One-Image Movie? – Wayne Heim",
    twitterDescription:
      "Discover One-Image Movies: narrative photography and single-frame cinematic storytelling by Wayne Heim.",
    twitterImage: "/og/one-image-movie.jpg",
  },

  "/Other/Historical-Reenactment-Photography": {
    ogTitle: "Historical Reenactment Photography – Wayne Heim",
    ogDescription:
      "Painterly historical reenactment and portrait photography—Civil War, WWII, and frontier characters rendered with cinematic, story-driven depth.",
    ogImage: "/og/historical-reenactment.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Historical Reenactment Photography – Wayne Heim",
    twitterDescription:
      "Fine art reenactment photography—Civil War, WWII, and frontier portraits by Wayne Heim.",
    twitterImage: "/og/historical-reenactment.jpg",
    canonicalUrl: "/Historical-Reenactment-Photography",
    ogUrl: "https://www.k4studios.com/Historical-Reenactment-Photography",
    twitterUrl: "https://www.k4studios.com/Historical-Reenactment-Photography",
    keywords: "historical reenactment photography, fine art reenactment photography, reenactor portraits, living history photography, Civil War reenactment, WWII reenactment, Wayne Heim",
  },

  "/Historical-Reenactment-Photography": {
    ogTitle: "Historical Reenactment Photography & Reenactor Portraits – Wayne Heim",
    ogDescription:
      "Historical reenactment photography, reenactor portraits, and living history photography covering Civil War, WWII, and frontier events through painterly, story-driven fine art.",
    ogImage: "/og/historical-reenactment.jpg",
    ogType: "article",
    twitterCard: "summary_large_image",
    twitterTitle: "Historical Reenactment Photography & Reenactor Portraits",
    twitterDescription:
      "Living history photography, reenactor portraits, and fine art historical scenes from Civil War, WWII, and frontier events by Wayne Heim.",
    twitterImage: "/og/historical-reenactment.jpg",
    keywords: "historical reenactment photography, reenactor photography, living history photography, reenactor portraits, Civil War reenactment photography, WWII reenactment photography, frontier reenactment photography, Wayne Heim",
  },

  "/Pictorialist-Photography": {
    ogTitle: "What Is Pictorialist Photography? Definition & Modern Pictorialism",
    ogDescription:
      "Pictorialist photography defined: the 19th-century fine art movement, its core traits, major artists, and why modern pictorialism matters again.",
    ogImage: "/og/painterly.jpg",
    ogType: "article",
    twitterCard: "summary_large_image",
    twitterTitle: "What Is Pictorialist Photography?",
    twitterDescription:
      "Definition, history, characteristics, and modern relevance of pictorialist photography.",
    twitterImage: "/og/painterly.jpg",
    keywords: "pictorialist photography, what is pictorialist photography, pictorialism photography definition, modern pictorialism photography, contemporary pictorialist photography, painterly photography, pictorialism, Alfred Stieglitz, Gertrude Kasebier, Edward Steichen, Wayne Heim",
  },

  "/Other/Series": {
    ogTitle: "Editions & Series – How the Work Is Offered | K4 Studios",
    ogDescription:
      "Explore how images at K4 Studios evolve across editions, materials, and narrative forms—from intimate Sketch studies to signed Legend statement works.",
    ogImage: "/images/editions-hero.webp",
    ogType: "article",
    twitterCard: "summary_large_image",
    twitterTitle: "Editions & Series – Collector Formats at K4 Studios",
    twitterDescription:
      "Discover the edition structure at K4 Studios: Sketch, Foundation, Chronicle, Legend, and Engrained series—each with distinct scale, scarcity, and intent.",
    twitterImage: "/images/editions-hero.webp",
  },

  "/Blog": {
    ogTitle: "Inside the Frame – Wayne Heim's Art Blog",
    ogDescription:
      "Conversations about layered storytelling, composition, and painterly photography. Behind-the-scenes insights into Wayne Heim's fine art process.",
    ogImage: "/og/blog.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Inside the Frame – Art Blog by Wayne Heim",
    twitterDescription:
      "Behind-the-scenes insights into painterly photography, storytelling, and fine art composition by Wayne Heim.",
    twitterImage: "/og/blog.jpg",
  },

  "/Other/Shows": {
    ogTitle: "K4 Picture Shows – Interactive Visual Presentations by Wayne Heim",
    ogDescription:
      "Experience immersive visual storytelling through K4 Picture Shows—cinematic fine art photography presentations that bring Western themes to life.",
    ogImage: "/images/K4-Stories logo1b.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "K4 Picture Shows – Visual Storytelling by Wayne Heim",
    twitterDescription:
      "Interactive picture shows combining fine art photography with cinematic Western storytelling by Wayne Heim.",
    twitterImage: "/images/K4-Stories logo1b.webp",
  },

  "/Other/Show": {
    ogTitle: "K4 Picture Show Stories – Cinematic Visual Narratives by Wayne Heim",
    ogDescription:
      "Curated visual stories and themed exhibitions featuring Wayne Heim's painterly Western photography—immersive slideshows with narrative depth.",
    ogImage: "/images/K4-Stories logo1b.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "K4 Picture Show Stories – Themed Visual Collections",
    twitterDescription:
      "Experience artist-curated visual stories combining fine art photography with cinematic Western storytelling by Wayne Heim.",
    twitterImage: "/images/K4-Stories logo1b.webp",
  },

  "/Galleries/Painterly-Fine-Art-Photography": {
    title: "Painterly Fine Art Photography - Wayne Heim",
    seoTitle: "Painterly Fine Art Photography - Wayne Heim",
    ogTitle:
      "Painterly Fine Art Photography by Wayne Heim",
    ogDescription:
      "Painterly western, historical, and landscape fine art photography—cowboys, portraits, and atmospheric scenes crafted with cinematic storytelling.",
    ogImage: "/og/painterly.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Painterly Fine Art Photography by Wayne Heim",
    twitterDescription:
      "Painterly western and historical storytelling photography by Wayne Heim.",
    twitterImage: "/og/painterly.jpg",
    keywords: "painterly fine art photography, painterly photography, painterly style photography, fine art photography, Western painterly photography, cinematic photography, Wayne Heim",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History": {
    ogTitle:
      "Facing History | Historically Themed Fine Art Photography by Wayne Heim",
    ogDescription:
      "Historically themed fine art photography by Wayne Heim, interpreting the Western frontier, Civil War, WWII, and Roaring 20s through researched detail, real subjects, painterly craft, and story-driven visual narrative.",
    ogImage: "/og/facing-history.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Facing History | Historically Themed Fine Art Photography",
    keywords: "historically themed fine art photography, historically themed photography, history themed photography, history inspired photography, historically inspired photography, Facing History, Civil War portraits, WWII fine art photography, Roaring 20s portraits, Western frontier photography, Wayne Heim",
    twitterDescription:
      "Painterly, history inspired fine art photography spanning the American West, Civil War, WWII, and the Roaring 20s.",
    twitterImage: "/og/facing-history.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits": {
    ogTitle:
      "Civil War Portraits | Historically Themed Fine Art Photography by Wayne Heim",
    ogDescription:
      "Historically themed Civil War fine art photography by Wayne Heim, focused on soldiers, sacrifice, researched period detail, and the human history of the era.",
    ogImage: "/og/civilwar.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Civil War Portraits | Historically Themed Photography",
    twitterDescription:
      "Civil War portraits and historically themed fine art photography by Wayne Heim.",
    twitterImage: "/og/civilwar.jpg",    keywords: "Civil War photography, Civil War portraits, Civil War fine art, historically themed photography, Civil War reenactment photography, Wayne Heim",  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits": {
    ogTitle:
      "1920s Portraits | Roaring 20s & Jazz Age Photography by Wayne Heim",
    ogDescription:
      "1920s portraits by Wayne Heim featuring Roaring 20s and Jazz Age flappers, gangsters, G-men, musicians, and speakeasy characters in painterly fine art photography.",
    ogImage: "/og/roaring20s.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "1920s Portraits | Roaring 20s & Jazz Age Photography",
    twitterDescription:
      "1920s portraits, Jazz Age characters, flappers, gangsters, and speakeasy figures by Wayne Heim.",
    twitterImage: "/og/roaring20s.jpg",
    keywords: "1920s portraits, 1920s portrait photography, Roaring 20s portraits, Jazz Age portraits, flapper portraits, speakeasy portraits, gangster portraits, Wayne Heim",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits": {
    title: "Western Cowboy Portraits - Wayne Heim",
    seoTitle: "Western Cowboy Portraits - Wayne Heim",
    ogTitle:
      "Western Cowboy Portraits | Cowboy Photography by Wayne Heim",
    ogDescription:
      "Explore Western cowboy portraits and cowboy photography by Wayne Heim: painterly fine art portraits, frontier characters, Old West figures, and collector prints.",
    ogImage: "https://k4studios.com/img/i-7Mzzbvp/l.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Western Cowboy Portraits | Cowboy Photography by Wayne Heim",
    twitterDescription:
      "Painterly cowboy portraits, frontier character studies, and fine art photography of the American West.",
    twitterImage: "https://k4studios.com/img/i-7Mzzbvp/l.jpg",
    keywords: "Western cowboy portraits, cowboy photography, cowboy portrait photography, Western portrait photography, cowboy portraits, Western cowboy photography, fine art cowboy photography, Old West photography, frontier portraits, Wayne Heim",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West": {
    title: "Western Photos & Wild West Photography by Wayne Heim",
    seoTitle: "Western Photos & Wild West Photography by Wayne Heim",
    ogTitle:
      "Western Photos & Wild West Photography by Wayne Heim",
    ogDescription:
      "Browse western photos, cowboy portraits, frontier scenes, Native American portraits, and Wild West photography by Wayne Heim, created as painterly Western fine art prints and wall art.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Western Photos & Wild West Photography by Wayne Heim",
    twitterDescription:
      "Browse western photos, cowboy portraits, frontier scenes, Native American portraits, and Wild West photography by Wayne Heim.",
    twitterImage: "/images/cowboy.webp",
    keywords: "western photos, Western photos, Wild West photography, cowboy photos, cowboy portraits, frontier scenes, Native American portraits, American frontier photography, Western fine art photography, painterly Western photography, Western wall art, Western fine art prints, Wayne Heim",
    descriptionMaxLength: 220,
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives": {
    title: "Western Narratives - Wayne Heim",
    seoTitle: "Western Narratives - Wayne Heim",
    ogTitle:
      "Western Narratives – Wayne Heim",
    ogDescription:
      "Narrative Western photography by Wayne Heim: cinematic frontier images built around implication, atmosphere, and the pressure of the larger story beyond the frame.",
    ogImage: "/images/tombstones/cowboy-c-ts.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Western Narratives – Narrative Western Photography",
    twitterDescription:
      "Narrative Western art and cinematic frontier photography by Wayne Heim.",
    twitterImage: "/images/tombstones/cowboy-c-ts.jpg",
    keywords: "narrative Western photography, Western narratives, narrative Western art, cinematic Western photography, Western storytelling photography, frontier narrative art, Wayne Heim",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans": {
    title: "Native American Portraits - Wayne Heim",
    seoTitle: "Native American Portraits - Wayne Heim",
    ogTitle:
      "Native American Portraits – Wayne Heim",
    ogDescription:
      "Native American fine art photography by Wayne Heim: painterly portraits in color and black and white shaped by presence, heritage, identity, and lived humanity.",
    ogImage: "/img/i-qLzRgbS/l.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Native American Portraits – Wayne Heim",
    twitterDescription:
      "Painterly Native American portraits in color and black and white by Wayne Heim.",
    twitterImage: "/img/i-qLzRgbS/l.jpg",
    keywords: "Native American fine art photography, Native American portraits, Indigenous portrait photography, painterly Native American portraits, Native American black and white photography, Native American color portrait photography, Indigenous fine art photography, Wayne Heim",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color": {
    title: "Native American Portraits - Color - Wayne Heim",
    seoTitle: "Native American Portraits - Color - Wayne Heim",
    ogTitle:
      "Native American Portraits - Color – Wayne Heim",
    ogDescription:
      "Painterly Native American color portrait photography by Wayne Heim, built around heritage, atmosphere, dignity, and human presence.",
    ogImage: "/img/i-qLzRgbS/l.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Native American Portraits - Color – Wayne Heim",
    twitterDescription:
      "Painterly Native American color portrait photography by Wayne Heim.",
    twitterImage: "/img/i-qLzRgbS/l.jpg",
    keywords: "Native American color portrait photography, Native American fine art photography, painterly Native American portraits, Indigenous portrait photography, Wayne Heim",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White": {
    title: "Native American Portraits - Black and White - Wayne Heim",
    seoTitle: "Native American Portraits - Black and White - Wayne Heim",
    ogTitle:
      "Native American Portraits - Black & White – Wayne Heim",
    ogDescription:
      "Black and white Native American portrait photography by Wayne Heim, emphasizing tone, structure, dignity, and presence.",
    ogImage: "/img/i-Z54nXZm/l.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Native American Portraits - Black & White – Wayne Heim",
    twitterDescription:
      "Monochrome Native American portrait photography by Wayne Heim.",
    twitterImage: "/img/i-Z54nXZm/l.jpg",
    keywords: "Native American black and white photography, Native American portrait photography, monochrome Indigenous portrait photography, painterly Native American portraits, Wayne Heim",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII": {
    ogTitle:
      "WWII Photography | World War II Portraits, Battle Scenes, and Machines",
    ogDescription:
      "Painterly WWII photography by Wayne Heim featuring World War II portraits, battle scenes, and military machines.",
    ogImage: "/og/wwii.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "WWII Photography | Portraits, Battle Scenes, and Machines",
    twitterDescription:
      "Painterly WWII photography spanning portraits, battle scenes, and military machines.",
    twitterImage: "/og/wwii.jpg",
    keywords: "WWII photography, World War II photography, World War 2 photography, WWII themed photography, WWII fine art photography, WWII battle photography, WWII portraits, WWII military machines, WWII reenactment photography, Wayne Heim",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War": {
    ogTitle:
      "WWII Battle Photography | World War II War Scenes by Wayne Heim",
    ogDescription:
      "WWII battle photography by Wayne Heim featuring combat scenes, battlefield tension, and wartime atmosphere rendered in painterly fine art.",
    ogImage: "/og/wwii-war.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "WWII Battle Photography | War Scenes by Wayne Heim",
    twitterDescription:
      "WWII battle scenes and World War II combat photography by Wayne Heim.",
    twitterImage: "/og/wwii-war.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits": {
    ogTitle:
      "WWII Portraits | World War II Portrait Photography by Wayne Heim",
    ogDescription:
      "WWII portraits by Wayne Heim featuring soldiers, reenactors, sacrifice, and the human side of World War II in painterly fine art photography.",
    ogImage: "/og/wwii-portraits.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "WWII Portraits | Photography by Wayne Heim",
    twitterDescription:
      "WWII portraits and World War II reenactment photography by Wayne Heim.",
    twitterImage: "/og/wwii-portraits.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines": {
    ogTitle:
      "Men & Machines – WWII Military Photography by Wayne Heim",
    ogDescription:
      "Painterly WWII military machines—tanks, trucks, armored vehicles, and wartime engineering rendered with dramatic fine art style.",
    ogImage: "/og/wwii-machines.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Men & Machines – WWII Photography",
    twitterDescription:
      "WWII tanks and machines captured as painterly fine art.",
    twitterImage: "/og/wwii-machines.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes": {
    ogTitle: "Painterly Landscapes – Photography by Wayne Heim",
    ogDescription:
      "Painterly fine art landscapes—mountains, coastlines, and Western vistas captured with cinematic mood, depth, and atmosphere.",
    ogImage: "/og/landscapes.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Painterly Landscape Photography – Wayne Heim",
    twitterDescription:
      "Painterly landscapes and fine art nature photography by Wayne Heim.",
    twitterImage: "/og/landscapes.jpg",
    keywords: "painterly landscape photography, fine art landscapes, painterly mountain photography, Western landscape photography, nature fine art, landscape wall art, Wayne Heim",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location": {
    ogTitle:
      "Painterly Landscapes by Location – Photography by Wayne Heim",
    ogDescription:
      "Explore painterly landscapes by region—West, Midwest, Northeast, South, and international vistas rendered with fine art depth.",
    ogImage: "/og/landscapes-location.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Landscapes by Location – Wayne Heim",
    twitterDescription:
      "Painterly landscapes by region: West, Midwest, Northeast, South, and more.",
    twitterImage: "/og/landscapes-location.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery": {
    ogTitle: "International Painterly Landscapes – Wayne Heim",
    ogDescription:
      "Painterly fine art landscapes from around the world—mountains, coasts, and dramatic vistas rendered with cinematic atmosphere.",
    ogImage: "/og/landscapes-intl.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "International Landscapes – Wayne Heim",
    twitterDescription:
      "Painterly fine art landscapes from international locations by Wayne Heim.",
    twitterImage: "/og/landscapes-intl.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery": {
    ogTitle: "Western Landscapes – Photography by Wayne Heim",
    ogDescription:
      "Painterly landscapes of the American West—mountains, plains, deserts, and dramatic skies captured in fine art style.",
    ogImage: "/og/landscapes-west.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "American West Landscapes – Wayne Heim",
    twitterDescription:
      "Painterly landscapes of the American West by Wayne Heim.",
    twitterImage: "/og/landscapes-west.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery": {
    ogTitle: "Midwest Landscapes – Photography by Wayne Heim",
    ogDescription:
      "Painterly Midwest landscapes—rolling fields, forests, farmlands, and heartland vistas rendered in fine art style.",
    ogImage: "/og/landscapes-midwest.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Midwest Landscapes – Wayne Heim",
    twitterDescription:
      "Painterly landscape photography of the Midwest by Wayne Heim.",
    twitterImage: "/og/landscapes-midwest.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery": {
    ogTitle: "Northeast Landscapes – Wayne Heim",
    ogDescription:
      "Painterly Northeast landscapes—mountains, rivers, forests, and dramatic seasonal color captured in fine art style.",
    ogImage: "/og/landscapes-northeast.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Northeast Landscapes – Wayne Heim",
    twitterDescription:
      "Painterly landscape photography of the Northeast by Wayne Heim.",
    twitterImage: "/og/landscapes-northeast.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery": {
    ogTitle: "Southern Landscapes – Photography by Wayne Heim",
    ogDescription:
      "Painterly landscapes of the American South—wetlands, forests, rivers, and coastal scenes rendered in fine art style.",
    ogImage: "/og/landscapes-south.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Southern Landscapes – Wayne Heim",
    twitterDescription:
      "Painterly landscape photography of the South by Wayne Heim.",
    twitterImage: "/og/landscapes-south.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme": {
    ogTitle: "Landscapes by Theme – Photography by Wayne Heim",
    ogDescription:
      "Painterly fine art landscapes grouped by theme—mountains, water, sunsets, and atmospheric scenes captured with cinematic mood.",
    ogImage: "/og/landscapes-theme.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Landscapes by Theme – Wayne Heim",
    twitterDescription:
      "Painterly landscapes by theme: mountains, water, sunsets by Wayne Heim.",
    twitterImage: "/og/landscapes-theme.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains": {
    ogTitle:
      "Mountain Landscapes – Fine Art Photography by Wayne Heim",
    ogDescription:
      "Painterly mountain landscapes—alpine peaks, rugged terrain, and dramatic western elevation captured with fine art depth.",
    ogImage: "/og/landscapes-mountains.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Mountain Landscapes – Wayne Heim",
    twitterDescription:
      "Painterly mountain landscape photography by Wayne Heim.",
    twitterImage: "/og/landscapes-mountains.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water": {
    ogTitle:
      "Water Landscapes – Fine Art Photography by Wayne Heim",
    ogDescription:
      "Painterly water landscapes—rivers, lakes, waterfalls, and coastlines captured with atmospheric fine art style.",
    ogImage: "/og/landscapes-water.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Water Landscapes – Wayne Heim",
    twitterDescription:
      "Painterly water and waterfall landscape photography by Wayne Heim.",
    twitterImage: "/og/landscapes-water.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets": {
    ogTitle:
      "Sunset Landscapes – Fine Art Photography by Wayne Heim",
    ogDescription:
      "Painterly sunset landscapes—golden skies, evening horizons, and dramatic western color captured in fine art style.",
    ogImage: "/og/landscapes-sunsets.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Sunset Landscapes – Wayne Heim",
    twitterDescription:
      "Painterly sunset and evening landscapes by Wayne Heim.",
    twitterImage: "/og/landscapes-sunsets.jpg",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Transportation": {
    ogTitle:
      "Transportation Fine Art Photography – Trains, Cars & Boats by Wayne Heim",
    ogDescription:
      "Painterly transportation photography—vintage trains, classic cars, warbirds, and boats captured as fine art prints.",
    ogImage: "/og/transportation.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Transportation Art – Photography by Wayne Heim",
    twitterDescription:
      "Painterly fine art photography of trains, cars, aircraft, and boats by Wayne Heim.",
    twitterImage: "/og/transportation.jpg",
    keywords: "transportation photography, train photography, vintage car photography, warbird photography, fine art transportation, classic car art, Wayne Heim",
  },

  "/Galleries/Painterly-Fine-Art-Photography/Miscellaneous": {
    ogTitle:
      "Miscellaneous Painterly Photography – Fine Art by Wayne Heim",
    ogDescription:
      "A curated collection of painterly fine art photographs—portraits, candid moments, and atmospheric scenes rendered with expressive depth.",
    ogImage: "/og/misc.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Miscellaneous Fine Art Photography – Wayne Heim",
    twitterDescription:
      "Painterly fine art portraits, candid moments, and atmospheric scenes by Wayne Heim.",
    twitterImage: "/og/misc.jpg",
  },

  "/Other/K4-Select-Series/Engrained": {
    ogTitle:
      "Engrained Series – Fine Art Wood Prints by Wayne Heim",
    ogDescription:
      "Stories etched in wood: fine art photography printed on Baltic birch—tone, grain, and texture becoming part of the artwork’s atmosphere and story.",
    ogImage: "/og/engrained.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle:
      "Engrained Series – Fine Art Wood Prints",
    twitterDescription:
      "Fine art photography printed on Baltic birch for rustic, museum-quality display.",
    twitterImage: "/og/engrained.jpg",
    keywords: "wood prints, fine art wood prints, Baltic birch prints, Engrained series, rustic fine art, Western wood prints, Wayne Heim",
  },

  "/Galleries/Fine-Art-Photography": {
    title: "Traditional Fine Art Photography by Wayne Heim",
    seoTitle: "Traditional Fine Art Photography by Wayne Heim",
    ogTitle: "Traditional Fine Art Photography by Wayne Heim",
    ogDescription:
      "Traditional fine art photography—landscapes, portraits, architecture, and atmospheric scenes captured with museum-quality precision.",
    ogImage: "/og/traditional.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Traditional Fine Art Photography – Wayne Heim",
    twitterDescription:
      "Fine art landscapes, portraits, and architecture by Wayne Heim.",
    twitterImage: "/og/traditional.jpg",
  },

  "/Galleries/Fine-Art-Photography/Landscapes": {
    title: "Traditional Landscape Photography by Wayne Heim",
    seoTitle: "Traditional Landscape Photography by Wayne Heim",
    ogTitle: "Traditional Landscape Photography by Wayne Heim",
    ogDescription:
      "Traditional landscape photography by Wayne Heim, spanning mountain ranges, western vistas, and atmospheric studies produced as museum-quality fine art prints.",
    ogImage: "/og/landscapes-color.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Traditional Landscape Photography by Wayne Heim",
    twitterDescription:
      "Traditional landscape fine art photography by Wayne Heim, from western vistas to atmospheric mountain studies.",
    twitterImage: "/og/landscapes-color.jpg",
    keywords: "traditional landscape photography, fine art landscape photography, western landscape photography, mountain landscape art, Wayne Heim",
  },

  "/Galleries/Fine-Art-Photography/Transportation": {
    title: "Traditional Transportation Photography by Wayne Heim",
    seoTitle: "Traditional Transportation Photography by Wayne Heim",
    ogTitle: "Traditional Transportation Photography by Wayne Heim",
    ogDescription:
      "Traditional transportation photography by Wayne Heim, featuring trains, aircraft, classic cars, and vessels interpreted as collectible fine art prints.",
    ogImage: "/og/transportation.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Traditional Transportation Photography by Wayne Heim",
    twitterDescription:
      "Fine art transportation photography by Wayne Heim featuring trains, planes, cars, and boats.",
    twitterImage: "/og/transportation.jpg",
    keywords: "transportation photography, train photography, aircraft photography, classic car photography, Wayne Heim",
  },

  "/Galleries/Fine-Art-Photography/Architecture": {
    title: "Architectural Fine Art Photography by Wayne Heim",
    seoTitle: "Architectural Fine Art Photography by Wayne Heim",
    ogTitle: "Architectural Fine Art Photography by Wayne Heim",
    ogDescription:
      "Architectural fine art photography by Wayne Heim, exploring form, geometry, atmosphere, and built history through traditional photographic craft.",
    ogImage: "/og/architecture.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Architectural Fine Art Photography by Wayne Heim",
    twitterDescription:
      "Architecture-focused fine art photography by Wayne Heim, centered on structure, form, and atmosphere.",
    twitterImage: "/og/architecture.jpg",
    keywords: "architectural photography, architecture fine art photography, traditional architecture photography, Wayne Heim",
  },

  "/Galleries/Fine-Art-Photography/Landscapes/By-Location": {
    title: "Landscape Photography by Location - Wayne Heim",
    seoTitle: "Landscape Photography by Location - Wayne Heim",
    ogTitle: "Landscape Photography by Location - Wayne Heim",
    ogDescription:
      "Landscape photography organized by location, featuring regional studies from the American West, Midwest, Northeast, South, and international destinations.",
    ogImage: "/og/landscapes-location.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Landscape Photography by Location | Wayne Heim",
    twitterDescription:
      "Explore traditional landscape photography by location, from U.S. regions to international destinations.",
    twitterImage: "/og/landscapes-location.jpg",
    keywords: "landscape photography by location, regional landscape photography, western landscape photography, Wayne Heim",
  },

  "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International": {
    title: "International Landscape Photography - Wayne Heim",
    seoTitle: "International Landscape Photography - Wayne Heim",
    ogTitle: "International Landscape Photography - Wayne Heim",
    ogDescription:
      "International landscape photography by Wayne Heim, including Iceland, the Faroe Islands, Newfoundland, and western Canada.",
    ogImage: "/og/landscapes-international.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "International Landscape Photography | Wayne Heim",
    twitterDescription:
      "International landscape studies by Wayne Heim from Iceland, the Faroe Islands, Newfoundland, and western Canada.",
    twitterImage: "/og/landscapes-international.jpg",
    keywords: "international landscape photography, Iceland photography, Faroe Islands photography, Newfoundland photography, Wayne Heim",
  },

  "/Galleries/Fine-Art-Photography/Landscapes/By-Theme": {
    title: "Fine Art Landscapes by Theme - Wayne Heim",
    seoTitle: "Fine Art Landscapes by Theme - Wayne Heim",
    ogTitle: "Fine Art Landscapes by Theme - Wayne Heim",
    ogDescription:
      "Themed landscape collections by Wayne Heim, including mountain studies, sunsets, water subjects, color work, and black-and-white landscapes.",
    ogImage: "/og/landscapes-theme.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Fine Art Landscapes by Theme | Wayne Heim",
    twitterDescription:
      "Browse themed landscape galleries from mountains and sunsets to water, color, and black-and-white studies.",
    twitterImage: "/og/landscapes-theme.jpg",
    keywords: "landscapes by theme, mountain landscape photography, sunset landscape photography, black and white landscapes, Wayne Heim",
  },

  "/Galleries/Fine-Art-Photography/Miscellaneous": {
    title: "Miscellaneous Fine Art Photography - Wayne Heim",
    seoTitle: "Miscellaneous Fine Art Photography - Wayne Heim",
    ogTitle: "Miscellaneous Fine Art Photography - Wayne Heim",
    ogDescription:
      "Miscellaneous fine art photography by Wayne Heim, spanning reenactments, wildlife, and pet portraits in a traditional style.",
    ogImage: "/og/misc.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Miscellaneous Fine Art Photography | Wayne Heim",
    twitterDescription:
      "Traditional-style miscellaneous galleries featuring reenactments, wildlife, and pet portraits.",
    twitterImage: "/og/misc.jpg",
    keywords: "miscellaneous fine art photography, wildlife photography, reenactment photography, pet portraits, Wayne Heim",
  },

  "/Galleries/Fine-Art-Photography/Portraits": {
    title: "Traditional Portrait Photography by Wayne Heim",
    seoTitle: "Traditional Portrait Photography by Wayne Heim",
    ogTitle: "Traditional Portrait Photography by Wayne Heim",
    ogDescription:
      "Traditional portrait photography by Wayne Heim, including color, black-and-white, and reenactor portrait studies shaped for fine art print presentation.",
    ogImage: "/og/portraits.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Traditional Portrait Photography by Wayne Heim",
    twitterDescription:
      "Traditional portrait studies by Wayne Heim in color, black-and-white, and reenactor series.",
    twitterImage: "/og/portraits.jpg",
    keywords: "traditional portrait photography, fine art portrait photography, reenactor portraits, black and white portraits, Wayne Heim",
  },

  "/Narrative-Western-Art": {
    title: "Narrative Western Art | Story-Led Frontier Fine Art by Wayne Heim",
    seoTitle: "Narrative Western Art | Story-Led Frontier Fine Art by Wayne Heim",
    ogTitle: "Narrative Western Art | Story-Led Frontier Fine Art by Wayne Heim",
    ogDescription:
      "Narrative Western art by Wayne Heim: story-led frontier fine art built around consequence, character, and historical atmosphere rather than decorative Western motifs.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Narrative Western Art | Wayne Heim",
    twitterDescription:
      "Story-led Western fine art rooted in frontier character, consequence, and atmosphere.",
    twitterImage: "/images/cowboy.webp",
    keywords: "narrative western art, western storytelling art, frontier narrative photography, Wayne Heim",
  },

  "/Fine-Art-Photography-of-the-American-West": {
    ogTitle: "Fine Art Photography of the American West | Historical, Painterly American West Photography – Wayne Heim",
    ogDescription:
      "Fine art photography of the American West by Wayne Heim: historically rooted, painterly photography spanning cowboy portraits, Indigenous presence, frontier lives, and the landscapes that shaped the American frontier.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Fine Art Photography of the American West | Historical, Painterly American West Photography",
    twitterDescription:
      "Historically rooted fine art photography of the American West by Wayne Heim. Cowboy portraits, frontier lives, Indigenous presence, and painterly landscapes.",
    twitterImage: "/images/cowboy.webp",
    keywords: "fine art photography american west, american west photography, american west fine art, american frontier photography, western fine art photography, painterly western photography, historical american west art, cowboy fine art photography, Wayne Heim",
  },

  "/American-Western-Art": {
    ogTitle: "American Western Art | Collector Prints, Cowboy Portraits & Frontier Narratives – Wayne Heim",
    ogDescription:
      "Browse American Western art by Wayne Heim: collector-focused cowboy portraits, Indigenous portrait work, and frontier narrative scenes offered as museum-quality fine art prints.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "American Western Art | Collector Prints & Frontier Narratives",
    twitterDescription:
      "Collector-focused American Western art by Wayne Heim. Browse cowboy portraits, Indigenous portrait work, and frontier narratives as fine art prints.",
    twitterImage: "/images/cowboy.webp",
    keywords: "american western art, american western art prints, cowboy portraits, frontier narratives, indigenous portrait art, western fine art prints, painterly western art, Wayne Heim",
  },

  "/Historical-Western-Art": {
    ogTitle: "Historical Western Art – Wayne Heim",
    ogDescription:
      "Historical Western art and historically themed Western photography by Wayne Heim — not modern ranch imagery — using narrative, painterly composition to explore the psychological lives of the American frontier.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Historical Western Art – Wayne Heim",
    twitterDescription:
      "Historical Western art, frontier portraiture, and historically themed Western photography by Wayne Heim. Narrative, painterly work rooted in the 19th-century West — not contemporary ranch documentation.",
    twitterImage: "/images/cowboy.webp",
    keywords: "historical western art, historical western photography, historically themed western photography, historical themed western photography, frontier art photography, 19th century western art, narrative western photography, painterly western art, psychological western portraiture, Wayne Heim",
  },

  "/Contemporary-Western-Art": {
    ogTitle: "Contemporary Western Art | Present-Tense Western Photography – Wayne Heim",
    ogDescription:
      "Contemporary Western art by Wayne Heim: present-tense painterly photography carrying the tradition of American Western art forward through modern visual language, character, and story.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Contemporary Western Art | Present-Tense Western Photography",
    twitterDescription:
      "Present-tense contemporary Western art and photography by Wayne Heim. Painterly images of the American West built for story, atmosphere, and collecting.",
    twitterImage: "/images/cowboy.webp",
    keywords: "contemporary western art, contemporary western photography, modern western art, contemporary art of the american west, present tense western art, painterly western art, Wayne Heim",
  },

  "/Western-Frontier-Art": {
    ogTitle: "Western Frontier Art | Painterly Fine Art of the American Frontier – Wayne Heim",
    ogDescription:
      "Western frontier art by Wayne Heim: historically rooted painterly fine art of the American frontier, centered on frontier life, character, tension, and consequence rather than generic Western decor.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Western Frontier Art | Painterly Fine Art of the American Frontier",
    twitterDescription:
      "Historically rooted frontier art by Wayne Heim. Painterly fine art of the American frontier focused on character, story, and lived frontier reality.",
    twitterImage: "/images/cowboy.webp",
    keywords: "western frontier art, american frontier art, art of the american frontier, frontier art, old west frontier art, historical western art, frontier art photography, painterly frontier art, Wayne Heim",
  },

  "/Western-Fine-Art-Photography": {
    ogTitle: "Western Fine Art Photography | Painterly Fine Art of the American West – Wayne Heim",
    ogDescription:
      "Western fine art photography by Wayne Heim: authored, painterly fine art of the American West centered on cowboy portraits, frontier characters, and narrative depth rather than decor, stock imagery, or modern Western lifestyle photography.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Western Fine Art Photography | Painterly Fine Art of the American West",
    twitterDescription:
      "Authored Western fine art photography by Wayne Heim. Painterly cowboy portraits and frontier scenes built for story, atmosphere, and collecting.",
    twitterImage: "/images/cowboy.webp",
    keywords: "Western fine art photography, cowboy portraits, Western art photography, fine art cowboy photography, American West photography, Western portrait photography, indigenous portraits, frontier fine art, Wayne Heim",
  },

  "/Western-Cowboy-Photography": {
    ogTitle: "Western Cowboy Photography – Wayne Heim",
    ogDescription:
      "Western cowboy photography and wild west cowboy portraits—authentic character studies from the American frontier, crafted with painterly depth and narrative restraint.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Western Cowboy Photography – Wayne Heim",
    twitterDescription:
      "Authentic cowboy portraits and wild west photography by Wayne Heim. Character-driven fine art from the American frontier.",
    twitterImage: "/images/cowboy.webp",
    keywords: "Western cowboy photography, cowboy portraits, wild west photography, cowboy portrait photography, Western cowboy portraits, fine art cowboy photography, authentic Western photography, Wayne Heim",
  },

  "/Western-Wall-Art": {
    ogTitle: "Western Wall Art | Western Art Prints & Cowboy Wall Art",
    ogDescription:
      "Western wall art by Wayne Heim, including Western art prints, cowboy wall art, vintage Western art, Civil War art prints, and frontier fine art for homes, offices, lodges, and collector interiors.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Western Wall Art | Western Art Prints & Cowboy Wall Art",
    twitterDescription:
      "Western art prints, cowboy wall art, vintage Western art, and frontier fine art for homes, offices, lodges, and collector interiors.",
    twitterImage: "/images/cowboy.webp",
    keywords: "Western wall art, western wall decor, western wall artwork, western art prints, western prints, cowboy wall art, cowboy artwork, vintage Western art, Civil War art prints, Western home decor, cowboy art prints, Wayne Heim",
  },

  "/Western-Black-and-White-Photography": {
    ogTitle: "Western Black and White Photography – Wayne Heim",
    ogDescription:
      "Western black and white photography by Wayne Heim. Monochrome cowboy portraits and frontier imagery with timeless, dramatic depth. Museum-quality fine art prints.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Western Black and White Photography – Wayne Heim",
    twitterDescription:
      "Dramatic black and white Western photography. Cowboy portraits and frontier scenes in timeless monochrome by Wayne Heim.",
    twitterImage: "/images/cowboy.webp",
    keywords: "Western black and white photography, black and white cowboy photography, monochrome Western art, black and white cowboy portraits, dramatic Western photography, fine art black and white, Wayne Heim",
  },

  "/Western-Photography-Art": {
    ogTitle: "Western Photography Art – Wayne Heim | K4 Studios",
    ogDescription:
      "Western photography art by Wayne Heim, also aligned with the term Western art photography. Authored frontier photography built through narrative intent, historical awareness, and painterly craft.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Western Photography Art – Wayne Heim",
    twitterDescription:
      "Western photography art and Western art photography by Wayne Heim. Painterly frontier photography shaped by narrative, atmosphere, and historical depth.",
    twitterImage: "/images/cowboy.webp",
    keywords: "Western photography art, Western art photography, American West photography art, frontier photography art, painterly Western photography, narrative Western art, Wayne Heim",
  },

  // ✅ HYBRID AUTHORITY–COMMERCE HUB — Collector onboarding page
  "/western-fine-art-photography-collection": {
    ogTitle: "Cowboy & Frontier Fine Art Prints for Collectors | K4 Studios",
    ogDescription:
      "Collector-focused selection of cowboy and frontier fine art prints by Wayne Heim. Painterly limited-edition works on archival paper, canvas, and Engrained wood panels.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Cowboy & Frontier Fine Art Prints for Collectors",
    twitterDescription:
      "Collector-focused cowboy and frontier fine art prints by Wayne Heim. Painterly limited-edition work built for exhibition and collecting.",
    twitterImage: "/images/cowboy.webp",
    keywords: "cowboy fine art photography collection, frontier fine art prints, western collector prints, painterly Western art, cowboy portraits, limited edition prints, Wayne Heim, Engrained wood prints",
  },

  // ✅ COWBOY AUTHORITY HUB – "Cowboy" as PRIMARY subject entity
  "/Cowboy-Fine-Art-Photography": {
    ogTitle: "Cowboy Fine Art Photography – Wayne Heim",
    ogDescription:
      "Cowboy fine art photography by Wayne Heim. This collection features cowboy photography and black and white cowboy photography—authentic portraits of working cowboys, rodeo riders, and frontier characters.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Cowboy Fine Art Photography – Wayne Heim",
    twitterDescription:
      "Cowboy fine art photography and black and white cowboy photography. Authentic cowboy portraits by Wayne Heim.",
    twitterImage: "/images/cowboy.webp",
    keywords: "cowboy fine art photography, cowboy photography, black and white cowboy photography, cowboy portraits, cowboy wall art, authentic cowboy photography, fine art cowboy prints, Wayne Heim",
  },

  "/Painterly-Western-Photography": {
    ogTitle: "Painterly Western Photography – Wayne Heim",
    ogDescription:
      "Painterly Western photography by Wayne Heim. Explore the discipline, light, and narrative philosophy behind character-driven cowboy portraits and frontier fine art.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Painterly Western Photography – Wayne Heim",
    twitterDescription:
      "The craft behind painterly Western photography. Discipline, light, and narrative philosophy in cowboy fine art by Wayne Heim.",
    twitterImage: "/images/cowboy.webp",
    keywords: "painterly Western photography, painterly fine art photography, Western fine art photography, cinematic Western photography, artistic cowboy photography, painterly cowboy portraits, Wayne Heim",
  },

  "/Western-Interior-Design-Art": {
    title: "Western Interior Design Art - Collector Prints by Wayne Heim",
    seoTitle: "Western Interior Design Art - Collector Prints by Wayne Heim",
    ogTitle: "Western Interior Design Art for Statement Spaces",
    ogDescription:
      "Western interior design art by Wayne Heim, curated as statement western artwork for residential, lodge, hospitality, and collector interiors.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Western Interior Design Art for Statement Spaces",
    twitterDescription:
      "Statement western artwork and painterly fine art photography for residential, lodge, hospitality, and collector interiors.",
    twitterImage: "/images/cowboy.webp",
    keywords: "western interior design art, western interior design artwork, western wall art, statement western artwork, fine art for western interiors, western decor fine art, lodge wall art, Wayne Heim",
  },

  "/Modern-Western-Interior-Design-Art": {
    title: "Modern Western Interior Design Art - Collector Prints by Wayne Heim",
    seoTitle: "Modern Western Interior Design Art - Collector Prints by Wayne Heim",
    ogTitle: "Modern Western Interior Design Art for Clean Spaces",
    ogDescription:
      "Modern western interior design art by Wayne Heim, curated for contemporary rooms, tonal restraint, open compositions, and statement western artwork.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Modern Western Interior Design Art",
    twitterDescription:
      "Contemporary western interior design artwork with restraint, tonal control, and statement-ready painterly fine art.",
    twitterImage: "/images/cowboy.webp",
    keywords: "modern western interior design, contemporary western interior design, modern western wall art, contemporary western wall art, statement western artwork, fine art for western interiors, Wayne Heim",
  },

  "/Rustic-Western-Interior-Design-Art": {
    title: "Rustic Western Interior Design Art - Collector Prints by Wayne Heim",
    seoTitle: "Rustic Western Interior Design Art - Collector Prints by Wayne Heim",
    ogTitle: "Rustic Western Interior Design Art for Lodge Spaces",
    ogDescription:
      "Rustic western interior design art by Wayne Heim, curated for lodge, ranch, hospitality, wood-led rooms, and warm material-driven interiors.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Rustic Western Interior Design Art",
    twitterDescription:
      "Rustic western wall art and painterly fine art photography for lodge, ranch, hospitality, and warm material-driven interiors.",
    twitterImage: "/images/cowboy.webp",
    keywords: "rustic western interior design, rustic western wall art, western lodge wall art, ranch house wall art, western interior design art, Engrained wood prints, Wayne Heim",
  },

  "/Western-Wall-Art-for-Interior-Designers": {
    title: "Western Wall Art for Interior Designers - Wayne Heim",
    seoTitle: "Western Wall Art for Interior Designers - Wayne Heim",
    ogTitle: "Western Wall Art for Interior Designers",
    ogDescription:
      "Western wall art for interior designers by Wayne Heim, curated for spec teams, statement walls, lodge projects, hospitality interiors, and multi-room plans.",
    ogImage: "/images/cowboy.webp",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Western Wall Art for Interior Designers",
    twitterDescription:
      "Specifier-ready western wall art for interior designers, lodge projects, hospitality interiors, and multi-room artwork plans.",
    twitterImage: "/images/cowboy.webp",
    keywords: "western wall art for interior designers, western interior designer, western artwork for interior designers, statement western artwork, lodge wall art, hospitality wall art, fine art for western interiors, Wayne Heim",
  },

  "default": {
    ogTitle: "Wayne Heim Fine Art Photography",
    ogDescription:
      "Painterly and traditional fine art photography—western, historical, and landscape storytelling crafted with cinematic and emotional depth. Collector prints available on paper or Baltic birch wood.",
    ogImage: "/og/default.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Wayne Heim Fine Art Photography",
    twitterDescription:
      "Painterly western, historical, and landscape fine art photography by Wayne Heim.",
    twitterImage: "/og/default.jpg",
  },
};

/* -----------------------------
   HELPERS (unchanged, required)
------------------------------*/

function buildUniqueDescription(baseDesc: string, path: string) {
  if (path === "/" || path === "/index") return baseDesc;

  const segment = path.split("/").filter(Boolean).slice(-1)[0] || "";
  const readable = segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();

  if (!segment || baseDesc.toLowerCase().includes(readable.toLowerCase()))
    return baseDesc;

  return `${baseDesc.replace(/\.*$/, "")} – ${readable} gallery by Wayne Heim.`;
}

function trimMetaDescription(desc: string, maxLength = 160) {
  if (!desc) return "";
  if (desc.length <= maxLength) return desc;

  const periodIdx = desc.lastIndexOf(".", maxLength);
  if (periodIdx > 80) return desc.slice(0, periodIdx + 1).trim();

  const spaceIdx = desc.lastIndexOf(" ", maxLength);
  return (
    (spaceIdx > 80 ? desc.slice(0, spaceIdx) : desc.slice(0, maxLength)).trim() +
    "…"
  );
}

/* -----------------------------
   MAIN FUNCTION (restored)
------------------------------*/

export function getLandingMeta(path: string, imageOverride?: string) {
  const clean = path.replace(/\/$/, "");

  const baseMeta = landingMetaDB[clean] || landingMetaDB["default"];

  const uniqueDesc = trimMetaDescription(
    buildUniqueDescription(baseMeta.ogDescription, clean),
    baseMeta.descriptionMaxLength
  );

  return {
    title: baseMeta.title || baseMeta.seoTitle || baseMeta.ogTitle,
    seoTitle: baseMeta.seoTitle || baseMeta.title || baseMeta.ogTitle,
    ogTitle: baseMeta.ogTitle,
    ogDescription: uniqueDesc,
    ogImage: imageOverride || baseMeta.ogImage,
    ogType: baseMeta.ogType || "website",
    ogUrl: "",
    twitterCard: baseMeta.twitterCard || "summary_large_image",
    twitterTitle: baseMeta.twitterTitle,
    twitterDescription: uniqueDesc,
    twitterImage: imageOverride || baseMeta.twitterImage,
    twitterUrl: "",
    description: uniqueDesc,
    keywords: baseMeta.keywords || "",
    descriptionMaxLength: baseMeta.descriptionMaxLength,
  };
}
