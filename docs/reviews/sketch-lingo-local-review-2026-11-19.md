# $25 / Sketch-lingo unification — local verification

2026-11-19. Local source and served-HTML review only. No production build, Git push, or deployment was run for this packet. Scout acceptance and promotion remain pending.

Review server: [localhost:8888](http://localhost:8888). The existing editor server was reused and remains running.

## Verification

- 13 requested doorway eyebrows use A2 verbatim; all carry the settled gateway clause exactly once. Existing subject sentences without pricing remain unchanged.
- 52 description layers inspected independently: meta description, Open Graph, Twitter, and the JSON-LD CollectionPage description on each doorway. No additional JSON-LD description fields were present on these 13 pages. Layer values and before/after status are enumerated below.
- 48 shared doorway/hub pages, 211 sampled grids: same pieces, counts, and stored order within each edition group. Both mixed and single-group paper samples now carry the matching edition label. No-paper Engrained samples receive no paper-price badge. Prices come from the same resolved offers as the /all grid.
- 53 Painterly/Traditional gallery landing HTML summaries show Limited Edition / 16" × 20" / $1,100 first, then Open Edition / 5" × 7" / $25. The order CTA wording is unchanged. This is a collection-level price overview; individual artwork summaries and order modals continue to show only the offers available for that artwork.
- The actual artwork Guide shows all seven configured size/price pairs, “where work begins”, “The Legend Series — A Statement of Voice & Legacy”, and Chronicle editions of 50. First open and post-reload text matched exactly.
- /Other/Series carries all seven prices, the settled limited-first introduction, and Legend Series naming. Its Sketch → Foundation → Chronicle → Legend section order is unchanged, as is the series-bar order everywhere.
- All 54 /all pages match the previous reviewed release for gateway paragraphs, eyebrows, linked text, explicit Engrained destinations, all metadata/JSON-LD, and artwork IDs/counts/order. Existing automatic keyword links may select different related artworks per render. This includes Narratives Color and the 47-work Engrained page.
- Limited artwork order modal: Chronicle only; no Sketch/Foundation. Ordinary Product offers remain $1,100; the public -sketch URL remains $25.
- Homepage and SSR doorway return 200. Desktop/mobile checks passed without JavaScript errors or horizontal overflow. Existing edition grouping/offer-policy tests (7) and Astro/inline-script compilation checks passed.

## Guide source audit

The quoted “four-legged legends of our travels” and Chronicle “limited editions of 250” variants were not present in active src/public/Netlify source. The only edition-of-250 match in the repository was an unimported archived GalleryEditorPro backup, not the Guide. The reported stale browser wording could not be reproduced, so its original delivery source is not established.

The Guide previously accepted an optional infoCopy override in addition to its bundled pricingConfig fallback; current callers supplied no override. That alternate input was removed. Guide prose now reads only src/data/pricingConfig.json; prices read the shared pricing layer. The public pricingConfig.json remains an exact generated/served mirror, not a separately authored version. Separate outdated editor fallback prose was also removed in favor of the canonical config. First open and reload were checked through the real component without mocking pricing or registry responses.

## Sample classification findings

The local baseline already had correct Limited/Open headings in mixed sample grids, unlike the older crawl described in the packet. No limited piece under an Open badge was observed in the current baseline. Homogeneous paper grids had no heading; those now receive their correct label. The classification data is reachable through resolveImageCommerce → buildEditionCatalog, shared with /all.

36 limited-only sample grids previously had no label. The current sample inventory contains 253 distinct limited artworks across 2060 displayed occurrences. The complete limited-artwork inventory follows; full per-page occurrences are recorded in .cache/sketch-lingo/report.json.

## Review addresses

- [/Western-Wall-Art](http://localhost:8888/Western-Wall-Art)
- [/Contemporary-Western-Art](http://localhost:8888/Contemporary-Western-Art)
- [/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color](http://localhost:8888/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color)
- [/Other/Series](http://localhost:8888/Other/Series)
- [/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/i-RdsBKX8](http://localhost:8888/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/i-RdsBKX8)
- [/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all](http://localhost:8888/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all)
- [/Other/K4-Select-Series/Engrained/Engrained-Series/all](http://localhost:8888/Other/K4-Select-Series/Engrained/Engrained-Series/all)
- [/](http://localhost:8888/)

## Description layers, per page

### /Western-Fine-Art

- **description** — unchanged; no $25 framing: K4 Studios — Gallery of Western Fine Art. Western fine art photography by Wayne Heim — cowboy portraits, frontier narratives, Native American portraits, and landscapes as fine art prints.
- **og:description** — unchanged; no $25 framing: K4 Studios — Gallery of Western Fine Art. Western fine art photography by Wayne Heim — cowboy portraits, frontier narratives, Native American portraits, and landscapes as fine art prints.
- **twitter:description** — unchanged; no $25 framing: K4 Studios — Gallery of Western Fine Art. Western fine art photography by Wayne Heim — cowboy portraits, frontier narratives, Native American portraits, and landscapes as fine art prints.
- **JSON-LD[0].@graph.0.description** — unchanged; no $25 framing: K4 Studios — Gallery of Western Fine Art. Western fine art photography by Wayne Heim — cowboy portraits, frontier narratives, Native American portraits, and landscapes as fine art prints.

### /Western-Wall-Art

- **description** — updated: Western wall art by Wayne Heim for homes, offices, lodges, ranch interiors, and collector walls. Cowboy portraits, frontier scenes, and Western landscape fine art prints in signed and numbered limited editions, with open-edition small works from $25.
- **og:description** — updated: Western wall art by Wayne Heim for homes, offices, lodges, ranch interiors, and collector walls. Cowboy portraits, frontier scenes, and Western landscape fine art prints in signed and numbered limited editions, with open-edition small works from $25.
- **twitter:description** — updated: Western wall art by Wayne Heim for homes, offices, lodges, ranch interiors, and collector walls. Cowboy portraits, frontier scenes, and Western landscape fine art prints in signed and numbered limited editions, with open-edition small works from $25.
- **JSON-LD[0].@graph.0.description** — updated: Western wall art by Wayne Heim for homes, offices, lodges, ranch interiors, and collector walls. Cowboy portraits, frontier scenes, and Western landscape fine art prints in signed and numbered limited editions, with open-edition small works from $25.

### /Western-Photography-Prints

- **description** — updated: Western photography prints by Wayne Heim — frontier narratives, cowboy portraits, and painterly Western scenes as signed and numbered limited edition prints, with open-edition small works from $25. Archival paper and select wood presentations for living rooms, offices, lodges, and collector walls.
- **og:description** — updated: Western photography prints by Wayne Heim — frontier narratives, cowboy portraits, and painterly Western scenes as signed and numbered limited edition prints, with open-edition small works from $25. Archival paper and select wood presentations for living rooms, offices, lodges, and collector walls.
- **twitter:description** — updated: Western photography prints by Wayne Heim — frontier narratives, cowboy portraits, and painterly Western scenes as signed and numbered limited edition prints, with open-edition small works from $25. Archival paper and select wood presentations for living rooms, offices, lodges, and collector walls.
- **JSON-LD[0].@graph.0.description** — updated: Western photography prints by Wayne Heim — frontier narratives, cowboy portraits, and painterly Western scenes as signed and numbered limited edition prints, with open-edition small works from $25. Archival paper and select wood presentations for living rooms, offices, lodges, and collector walls.

### /western-art-prints

- **description** — unchanged; no $25 framing: Western art prints by Wayne Heim. Frontier scenes, cowboy portraits, black and white Western prints, framed wall art, paper prints, and collector editions for rooms and walls.
- **og:description** — unchanged; no $25 framing: Western art prints by Wayne Heim. Frontier scenes, cowboy portraits, black and white Western prints, framed wall art, paper prints, and collector editions for rooms and walls.
- **twitter:description** — unchanged; no $25 framing: Western art prints by Wayne Heim. Frontier scenes, cowboy portraits, black and white Western prints, framed wall art, paper prints, and collector editions for rooms and walls.
- **JSON-LD[0].@graph.0.description** — unchanged; no $25 framing: Western art prints by Wayne Heim. Frontier scenes, cowboy portraits, black and white Western prints, framed wall art, paper prints, and collector editions for rooms and walls.

### /cowboy-art-prints

- **description** — updated: Cowboy art prints by Wayne Heim. Western cowboy portraits, frontier narrative artwork, black and white prints, archival paper editions, and signed and numbered limited editions, with open-edition small works from $25.
- **og:description** — updated: Cowboy art prints by Wayne Heim. Western cowboy portraits, frontier narrative artwork, black and white prints, archival paper editions, and signed and numbered limited editions, with open-edition small works from $25.
- **twitter:description** — updated: Cowboy art prints by Wayne Heim. Western cowboy portraits, frontier narrative artwork, black and white prints, archival paper editions, and signed and numbered limited editions, with open-edition small works from $25.
- **JSON-LD[0].@graph.0.description** — updated: Cowboy art prints by Wayne Heim. Western cowboy portraits, frontier narrative artwork, black and white prints, archival paper editions, and signed and numbered limited editions, with open-edition small works from $25.

### /cowboy-artwork-prints

- **description** — updated: Cowboy artwork prints by Wayne Heim. Cowboy portrait prints, black and white studies, frontier scenes, and Western fine art prints in signed and numbered limited editions, with open-edition small works from $25.
- **og:description** — updated: Cowboy artwork prints by Wayne Heim. Cowboy portrait prints, black and white studies, frontier scenes, and Western fine art prints in signed and numbered limited editions, with open-edition small works from $25.
- **twitter:description** — updated: Cowboy artwork prints by Wayne Heim. Cowboy portrait prints, black and white studies, frontier scenes, and Western fine art prints in signed and numbered limited editions, with open-edition small works from $25.
- **JSON-LD[0].@graph.0.description** — updated: Cowboy artwork prints by Wayne Heim. Cowboy portrait prints, black and white studies, frontier scenes, and Western fine art prints in signed and numbered limited editions, with open-edition small works from $25.

### /cowboy-fine-art-prints

- **description** — updated: Cowboy fine art prints by Wayne Heim. Color cowboy portraits, black and white studies, frontier scenes, and archival Western prints in signed and numbered limited editions, with open-edition small works from $25.
- **og:description** — updated: Cowboy fine art prints by Wayne Heim. Color cowboy portraits, black and white studies, frontier scenes, and archival Western prints in signed and numbered limited editions, with open-edition small works from $25.
- **twitter:description** — updated: Cowboy fine art prints by Wayne Heim. Color cowboy portraits, black and white studies, frontier scenes, and archival Western prints in signed and numbered limited editions, with open-edition small works from $25.
- **JSON-LD[0].@graph.0.description** — updated: Cowboy fine art prints by Wayne Heim. Color cowboy portraits, black and white studies, frontier scenes, and archival Western prints in signed and numbered limited editions, with open-edition small works from $25.

### /cowboy-wall-art

- **description** — updated: Cowboy wall art prints by Wayne Heim for homes, offices, lodges, and ranch interiors. Portrait and narrative Western art prints in signed and numbered limited editions, with open-edition small works from $25.
- **og:description** — updated: Cowboy wall art prints by Wayne Heim for homes, offices, lodges, and ranch interiors. Portrait and narrative Western art prints in signed and numbered limited editions, with open-edition small works from $25.
- **twitter:description** — updated: Cowboy wall art prints by Wayne Heim for homes, offices, lodges, and ranch interiors. Portrait and narrative Western art prints in signed and numbered limited editions, with open-edition small works from $25.
- **JSON-LD[0].@graph.0.description** — updated: Cowboy wall art prints by Wayne Heim for homes, offices, lodges, and ranch interiors. Portrait and narrative Western art prints in signed and numbered limited editions, with open-edition small works from $25.

### /Western-Interior-Design-Art

- **description** — unchanged; no $25 framing: Western interior design art by Wayne Heim for homes, lodges, ranch interiors, offices, and hospitality spaces. Cowboy portraits, Western landscapes, mountain prints, and water studies for rooms that need presence.
- **og:description** — unchanged; no $25 framing: Western interior design art by Wayne Heim for homes, lodges, ranch interiors, offices, and hospitality spaces. Cowboy portraits, Western landscapes, mountain prints, and water studies for rooms that need presence.
- **twitter:description** — unchanged; no $25 framing: Western interior design art by Wayne Heim for homes, lodges, ranch interiors, offices, and hospitality spaces. Cowboy portraits, Western landscapes, mountain prints, and water studies for rooms that need presence.
- **JSON-LD[0].@graph.0.description** — unchanged; no $25 framing: Western interior design art by Wayne Heim for homes, lodges, ranch interiors, offices, and hospitality spaces. Cowboy portraits, Western landscapes, mountain prints, and water studies for rooms that need presence.

### /Modern-Western-Interior-Design-Art

- **description** — unchanged; no $25 framing: Modern Western interior design art by Wayne Heim. Restrained cowboy portraits, Western landscapes, mountain studies, and fine art prints for contemporary rooms.
- **og:description** — unchanged; no $25 framing: Modern Western interior design art by Wayne Heim. Restrained cowboy portraits, Western landscapes, mountain studies, and fine art prints for contemporary rooms.
- **twitter:description** — unchanged; no $25 framing: Modern Western interior design art by Wayne Heim. Restrained cowboy portraits, Western landscapes, mountain studies, and fine art prints for contemporary rooms.
- **JSON-LD[0].@graph.0.description** — unchanged; no $25 framing: Modern Western interior design art by Wayne Heim. Restrained cowboy portraits, Western landscapes, mountain studies, and fine art prints for contemporary rooms.

### /Rustic-Western-Interior-Design-Art

- **description** — updated: Rustic Western interior design art by Wayne Heim for lodge interiors, ranch homes, stone, leather, and raw wood rooms. Fine art prints in signed and numbered limited editions, with open-edition small works from $25 plus select Engrained Baltic Birch panels.
- **og:description** — updated: Rustic Western interior design art by Wayne Heim for lodge interiors, ranch homes, stone, leather, and raw wood rooms. Fine art prints in signed and numbered limited editions, with open-edition small works from $25 plus select Engrained Baltic Birch panels.
- **twitter:description** — updated: Rustic Western interior design art by Wayne Heim for lodge interiors, ranch homes, stone, leather, and raw wood rooms. Fine art prints in signed and numbered limited editions, with open-edition small works from $25 plus select Engrained Baltic Birch panels.
- **JSON-LD[0].@graph.0.description** — updated: Rustic Western interior design art by Wayne Heim for lodge interiors, ranch homes, stone, leather, and raw wood rooms. Fine art prints in signed and numbered limited editions, with open-edition small works from $25 plus select Engrained Baltic Birch panels.

### /Western-Wall-Art-for-Interior-Designers

- **description** — updated: Western wall art for interior designers by Wayne Heim. Project-ready cowboy portraits, frontier narratives, Western landscapes, mountain prints, and fine art print options in signed and numbered limited editions, with open-edition small works from $25.
- **og:description** — updated: Western wall art for interior designers by Wayne Heim. Project-ready cowboy portraits, frontier narratives, Western landscapes, mountain prints, and fine art print options in signed and numbered limited editions, with open-edition small works from $25.
- **twitter:description** — updated: Western wall art for interior designers by Wayne Heim. Project-ready cowboy portraits, frontier narratives, Western landscapes, mountain prints, and fine art print options in signed and numbered limited editions, with open-edition small works from $25.
- **JSON-LD[0].@graph.0.description** — updated: Western wall art for interior designers by Wayne Heim. Project-ready cowboy portraits, frontier narratives, Western landscapes, mountain prints, and fine art print options in signed and numbered limited editions, with open-edition small works from $25.

### /WWII-Themed-Fine-Art-Prints

- **description** — updated: WWII themed fine art prints by Wayne Heim. War scenes, military machines, and wartime portraits shaped as historical fine art. Signed and numbered limited edition prints, with open-edition small works from $25.
- **og:description** — updated: WWII themed fine art prints by Wayne Heim. War scenes, military machines, and wartime portraits shaped as historical fine art. Signed and numbered limited edition prints, with open-edition small works from $25.
- **twitter:description** — updated: WWII themed fine art prints by Wayne Heim. War scenes, military machines, and wartime portraits shaped as historical fine art. Signed and numbered limited edition prints, with open-edition small works from $25.
- **JSON-LD[0].@graph.0.description** — updated: WWII themed fine art prints by Wayne Heim. War scenes, military machines, and wartime portraits shaped as historical fine art. Signed and numbered limited edition prints, with open-edition small works from $25.

## Limited sample artwork inventory

| ID | Artwork | Offered paper series | Sample pages |
| --- | --- | --- | --- |
| i-MHGPvcs | $3 for a whiskey? | chronicle | 1 |
| i-kxnK2MM | 10 O - Clock Staging | chronicle | 1 |
| i-9wQL5tH | A is for the Aftermath | chronicle | 1 |
| i-m3DqTjX | A Pact in Shadow | chronicle | 1 |
| i-GH7H4LC | A Promise Kept | chronicle | 1 |
| i-qB47jJT | A Quiet Understanding | chronicle | 2 |
| i-BxK562q | A Reach of Faith | chronicle | 1 |
| i-6z4gpF7 | A Sheriff's Silent Oath | chronicle | 3 |
| i-W73hxx4 | A Wink and a Nod | chronicle | 28 |
| i-rRdrQBg | Above the Divide | chronicle | 15 |
| i-6xL8p7Z | Across Open Ground | chronicle | 1 |
| i-dqdZcnX | After All This Time | chronicle | 1 |
| i-8g6m7tf | After the Day's Work | chronicle | 1 |
| i-xfVhZw7 | After the Drums Fade | chronicle | 8 |
| i-7SDqg5R | All Mine | chronicle | 1 |
| i-nd3Wr3d | All Smiles | chronicle | 2 |
| i-8VPQmkW | Anticipation | chronicle | 5 |
| i-8NsWqJQ | At Full Draw | chronicle | 9 |
| i-7Kwv8vc | Beacon of Hope | chronicle | 1 |
| i-thpSjMG | Bearing the West | chronicle | 13 |
| i-J3dh2p4 | Before the Next Mile | chronicle | 1 |
| i-7dCKHjg | Before the Wind Answers | chronicle | 1 |
| i-qzGSQz7 | Before You Go | chronicle | 1 |
| i-LjBc6N6 | Between the Banks | chronicle | 1 |
| i-5DbNvHj | Between the Trees | chronicle | 7 |
| i-jFZMg3C | Brotherhood in Motion | chronicle | 1 |
| i-6CvnjQ5 | By Lamplight | chronicle | 2 |
| i-GG7mgqM | Campfire Counsel | chronicle | 1 |
| i-4Hz6D7k | Carried Forward | chronicle | 15 |
| i-g6Trjng | Carved Wide | chronicle | 2 |
| i-Sc9hZGs | Change of Plans | chronicle | 1 |
| i-DLnxMgZ | Charge of Reckoning | chronicle | 2 |
| i-v4vRSb8 | Chasing the Devil's Tail | chronicle | 1 |
| i-TpkTsMg | Closing the Distance | chronicle | 1 |
| i-RsLmsLZ | Color of Conviction | chronicle legend | 1 |
| i-qXd5779 | Come Back to Me | chronicle | 1 |
| i-jWDDpC4 | Cotton Candy | chronicle | 15 |
| i-HBRmWg4 | Cough and Covenant | chronicle legend | 1 |
| i-6dHrd9m | Counting It Twice | chronicle | 1 |
| i-8W7jxkN | Cow Hand | chronicle | 1 |
| i-NKdPDCg | Darn Socks | chronicle | 32 |
| i-LCspRF4 | Day in Review | chronicle | 31 |
| i-4Wsxmqv | Deviation of Destiny | chronicle | 13 |
| i-Nn7scqm | Do you HEAR me now?! | chronicle legend | 1 |
| i-WzTZ6Jv | Doesn't Look Good | chronicle | 1 |
| i-SrPqX7H | Don't Think You Can Sneak Up on Me | chronicle | 3 |
| i-drTwKMw | Drawing Water | chronicle | 1 |
| i-dsqgfVj | Driven by Dust and Duty | chronicle | 1 |
| i-cFhZXJc | Dust or Desperation | chronicle | 2 |
| i-8zkKqtg | Earned in Small Change | chronicle | 1 |
| i-NgkC4Zt | Elder of the Crossing | chronicle | 15 |
| i-bq4FKvX | End of His Rope | chronicle | 26 |
| i-NzMs3RH | End of the Day | chronicle | 1 |
| i-V5WcTqg | Entertaining the Notion | chronicle | 1 |
| i-8rsG6P9 | Every Morning | chronicle | 1 |
| i-QWcX7JT | Eye Bound Promise | chronicle | 35 |
| i-5j2Knmb | Eye of the Hunt | chronicle legend | 1 |
| i-dc76hpJ | Fight in His Eyes | chronicle | 1 |
| i-cV5gwWZ | Final Deposit | chronicle | 1 |
| i-52tTd9G | Final Stand | chronicle | 1 |
| i-PM4d3g3 | Fire Side Chat | chronicle | 1 |
| i-V5djX4B | First Light | chronicle | 1 |
| i-jcLJT4J | For Better or Worse | chronicle | 34 |
| i-ZPmj5Wk | Frontier Huntress | chronicle | 33 |
| i-X4SH26N | Gentle Companion | chronicle | 2 |
| i-9Bpj29K | Get Off My Land! | chronicle | 1 |
| i-cGDk6Nc | Getting the Last Word | chronicle | 29 |
| i-vcX6WLC | Getting the last word in a grudge held too long | chronicle | 1 |
| i-ZRFr8hd | Golden Silence | chronicle | 1 |
| i-6GQxb97 | Got Your Back | chronicle | 1 |
| i-btSc5RS | Grave Light | chronicle | 1 |
| i-qpF8JQN | Hands That Learn | chronicle | 3 |
| i-4zxZQQ2 | Heading Home | chronicle | 31 |
| i-VhHKttr | Held at the Tree Line | chronicle | 1 |
| i-nZbDC9C | Held by Memory | chronicle | 29 |
| i-phBP9Mt | Held by Those Before | chronicle | 2 |
| i-Z8pZLnt | Held Close | chronicle | 13 |
| i-67Qt8WM | Held Close | chronicle | 8 |
| i-CNrD7G7 | Held Close | chronicle | 1 |
| i-Q3Qm4f2 | Held in Thought | chronicle | 2 |
| i-tfZTHXq | Held on the Sight | chronicle | 2 |
| i-QB4jLsH | Hell or High Water | chronicle | 1 |
| i-pNSX6cp | Hired Gun - Ranger on the Rails | chronicle | 1 |
| i-zqZBdJF | Holding the High Ground | chronicle | 1 |
| i-hrx5g4S | I Am Listening | chronicle | 24 |
| i-tWx3N8c | I Am Smiling | chronicle | 2 |
| i-R2JG4bd | I Got This | chronicle | 1 |
| i-DczpNpH | If You Want a Job Done Right... | chronicle | 2 |
| i-mbND55n | In the Crossfire | chronicle | 1 |
| i-qLzRgbS | In the Presence of Time | chronicle | 15 |
| i-wfqSGcV | Inevitable | chronicle | 1 |
| i-5Md3dQ3 | It's Just a One Day Ride to Spearfish. What Could Possibly Go Wrong? | chronicle | 1 |
| i-6Ffpw9t | Jane | chronicle | 34 |
| i-6pLTtkL | Just a Flesh Wound | chronicle | 1 |
| i-fM9qmKW | Just a Sip to Settle My Nerves | chronicle legend | 26 |
| i-Wx5scCf | Justified - or Damned: The Wounded Man at Stone | chronicle legend | 1 |
| i-mHpH7rZ | Keeping Cover | chronicle | 1 |
| i-CzWxpvV | Keeping Them Moving | chronicle | 1 |
| i-Gqw3s5s | Keeping Watch | chronicle legend | 1 |
| i-xpv7z8j | Land of Promise and Threat | chronicle legend | 31 |
| i-8CfzGMc | Last Chance Riders | chronicle | 1 |
| i-7Mzzbvp | Last Hand | chronicle legend | 31 |
| i-XR9PZT5 | Late for Dinner | chronicle | 4 |
| i-spjF4Zd | Lawman Portrait | chronicle | 2 |
| i-tMGHpqv | Leading the Way | chronicle | 3 |
| i-5rq7gcD | Let No Man Put Asunder | chronicle | 2 |
| i-G7csptc | Lifted | chronicle | 28 |
| i-qMQf7b6 | Loading Resolve or Revenge | chronicle | 28 |
| i-Txh4c8k | Loose Ends: Cowboy Roping Skills | chronicle | 28 |
| i-Zp9288b | Lowered Eyes | chronicle | 1 |
| i-5fm7Hhr | Making a Run For It | chronicle | 1 |
| i-sTnckb6 | Making Their Stand | chronicle | 1 |
| i-s79JnZ2 | Marshaling | chronicle | 1 |
| i-c5K798H | Meant What I Said! | chronicle legend | 31 |
| i-qJtstjP | Midstream | chronicle | 1 |
| i-ShhCNkX | Miles to Go | chronicle | 1 |
| i-8BbMZjs | Minding the Herd | chronicle | 32 |
| i-rDTVGSF | Mirror of the Peaks | chronicle | 1 |
| i-5FX3W9r | Morning Joe | chronicle | 1 |
| i-HfQ5NVR | Morning Joe: Cowboy with His First Coffee of the Day | chronicle | 28 |
| i-dTxwFN4 | Morning Watch | chronicle | 3 |
| i-6mQrB7h | Music Lessons | chronicle | 2 |
| i-kh6KWS9 | Negotiation | chronicle | 1 |
| i-8zFZ3jn | Night Light | chronicle | 29 |
| i-trZrk2w | Night Raid | chronicle legend | 1 |
| i-gj4hHmL | Night Rescue | chronicle | 1 |
| i-NxjDRLV | No coyotes, just a snake! | chronicle | 1 |
| i-46kWCqc | No Looking Back | chronicle | 1 |
| i-7vSccct | No Room for Error | chronicle | 1 |
| i-gQ7GZ5s | No Second Guess | chronicle | 1 |
| i-PPJ9GKf | No Time to Wait | chronicle | 1 |
| i-dwk4K8v | Now let's see you dance! | chronicle | 1 |
| i-Vhv8w9H | Of One Mind and Body | chronicle | 1 |
| i-sPkKGnX | Old Friends | chronicle | 1 |
| i-3ppJNtd | Old Guard | chronicle | 3 |
| i-SwhsL2h | Old West Window Light - A Vigil Kept | chronicle | 5 |
| i-8JHmjF9 | Older Than the Range | chronicle | 7 |
| i-3vxbnpZ | On Watch | chronicle | 1 |
| i-5TGTZ9P | One Clean Shot | chronicle | 1 |
| i-ncFcHDM | One Last Look | chronicle legend | 34 |
| i-7VWX9vk | One Way Out | chronicle | 30 |
| i-44jcjTQ | Over My Dead Body: Frontier Stand-off | chronicle legend | 29 |
| i-fTHtL25 | Paused Mid-Stitch | chronicle | 1 |
| i-kQfftQ2 | Pinkerton's Grasp | chronicle | 29 |
| i-zv8VJBg | Pinned Down | chronicle | 1 |
| i-vTp98Z6 | Portrait of Red | chronicle | 2 |
| i-XnW7ZD5 | Powder and Resolve | chronicle | 1 |
| i-KVxkXrV | Rescue Mission #2 | chronicle | 1 |
| i-4bn8bBz | Rider on the Open Plain | chronicle | 1 |
| i-k5zmxS5 | Ridge of Reckoning | chronicle | 1 |
| i-xqZwcZh | Righteous Pursuit | chronicle | 1 |
| i-zt2btJ7 | Rooted in Breath | chronicle | 13 |
| i-RdsBKX8 | Rooted in Dust | chronicle | 3 |
| i-5BtMrfM | Running Out of Time | chronicle | 4 |
| i-MB2KXB3 | Running Thin | chronicle | 1 |
| i-RdTR7GD | Saying Goodbye | chronicle | 1 |
| i-rhqqrfz | Schooling | chronicle | 1 |
| i-GzcBLWP | Seeing It First | chronicle | 1 |
| i-Xm6WSP3 | Shade and Solitude | chronicle | 1 |
| i-m6WKrNG | Sheltered in a Notion of Safety | chronicle | 1 |
| i-hMXZ8Xh | Show me a sign. | chronicle | 1 |
| i-cfW89QP | Signal from the Ridge | chronicle | 31 |
| i-r5Pb7zJ | Signs | chronicle legend | 1 |
| i-2D49wp7 | Slow Water | chronicle | 1 |
| i-LL2Gp5r | Special Delivery | chronicle | 1 |
| i-2GsTkqf | Standing His Ground | chronicle | 27 |
| i-WfRwfpM | Standing Into Tomorrow | chronicle | 15 |
| i-8JSdTGz | Standing Together | chronicle | 1 |
| i-XmhTdjF | Standing Watch | chronicle | 29 |
| i-mqQxwNn | Standing Watch | chronicle | 28 |
| i-J8Tr628 | Steady Now | chronicle | 1 |
| i-SVwxn5L | Still at the Table | chronicle | 1 |
| i-RKgJWdw | Stories by the Fire | chronicle | 1 |
| i-VDLVwqr | Strange Bedfellows | chronicle | 1 |
| i-Nvn4r5N | Sunset on Emerald Lake and the Lodge | chronicle | 1 |
| i-rqk5Kdk | Taking a Stand | chronicle | 28 |
| i-WfrdxRR | Teton Reflections | chronicle | 14 |
| i-7mFGRtw | The Bill Comes Due | chronicle | 1 |
| i-zTWQkqD | The Devil Comes in Daylight | chronicle | 30 |
| i-fhnpqP8 | The Hole in His Hat | chronicle | 1 |
| i-3SxncXS | The Keeper of Old Winds | chronicle | 33 |
| i-zk7zXP3 | The Last Warmth in the Grass | chronicle | 7 |
| i-fCSxt3j | The Long Line Home | chronicle | 12 |
| i-RT474Nz | The Long Reckoning | chronicle | 1 |
| i-xZkmnnx | The Measure of a Man | chronicle | 1 |
| i-g6pX48d | The Milky Way Over Sunwapta Falls | chronicle | 1 |
| i-PvHHPSq | The Moment After Amen | chronicle legend | 1 |
| i-RLZFsxp | The Old Hand | chronicle | 27 |
| i-g7SCMTD | The Pause Inside the Weather | chronicle | 14 |
| i-b2hZptn | The Pause Inside the Weather | chronicle | 7 |
| i-727jVkX | The Quiet Calculation | chronicle | 27 |
| i-NdQnj6P | The Slow Breath of Evening | chronicle | 26 |
| i-ffzG95X | The Waiting Game | chronicle | 24 |
| i-KG7ZwXT | The Waterline | chronicle | 1 |
| i-stm5tCK | The Way Forward | chronicle | 1 |
| i-gQmqxZJ | The Weight of Feathers | chronicle | 13 |
| i-Dw6Z8ff | There's a Storm a Brewin' | chronicle | 32 |
| i-T7TFJX2 | This Is the Hand - I Can Feel It | chronicle legend | 1 |
| i-Vr8vzjt | This Is Where I Stand | chronicle | 1 |
| i-dNgct6r | Three Thousand Reasons | chronicle | 1 |
| i-bfKMXS9 | Three Wise Men | chronicle legend | 30 |
| i-xhX479V | Through the Smoke | chronicle | 1 |
| i-f4MSxpP | Through the Water and the Dawn | chronicle | 1 |
| i-smMGtDZ | Through Wild Water | chronicle | 1 |
| i-B7ZSdfs | Till Death Do Us Part | chronicle legend | 30 |
| i-jLSNwCT | Together Forever | chronicle | 1 |
| i-KBNSftv | Told you to stay away from my sister! | chronicle | 1 |
| i-mpfG8XF | Trail Hardened | chronicle | 1 |
| i-RjSqqDt | Triangles | chronicle | 2 |
| i-ZKCtdPV | Trouble Approaching | chronicle | 1 |
| i-gxMVNh3 | Tumbleweed Whispers | chronicle | 30 |
| i-2Xw7qGL | Under a Bruised Sky | chronicle | 1 |
| i-h6SnLK4 | Under a Watchful Sky | chronicle | 1 |
| i-kp5NHNw | Under Fire, Over the Line | chronicle | 28 |
| i-kVr4LnG | Under Open Sky | chronicle | 12 |
| i-5HpSkgR | Unfinished Business | chronicle | 1 |
| i-sDZFJ6t | Unspoken | chronicle | 12 |
| i-rfFBRQM | Untimely Parting | chronicle legend | 2 |
| i-JvnhWXr | Up to No Good | chronicle | 29 |
| i-mLPgSpC | Up to No Good | chronicle | 1 |
| i-7GcQw6R | Wagonlight | chronicle | 1 |
| i-N3S92fb | Waiting | chronicle | 1 |
| i-HZK96qf | Waiting by the Window | chronicle | 1 |
| i-MpBPrZK | Waiting for a Name | chronicle | 1 |
| i-b3vCXwR | Waiting for Action | chronicle | 31 |
| i-dLDF4Q6 | Waiting for His Return: Black and White Western Portrait | chronicle | 25 |
| i-Q3ZbWvV | Waiting on the Day | chronicle | 1 |
| i-LmpRvHw | Watching the High Ground | chronicle | 15 |
| i-bN9mRH6 | Watching the Sky | chronicle | 1 |
| i-9FCHdBp | Watching the Sky Settle | chronicle | 1 |
| i-hrghzzx | We're Going to Be Rich | chronicle | 1 |
| i-T6bD4w7 | Weathered | chronicle | 32 |
| i-BzhQxMz | Weathered Patience | chronicle | 2 |
| i-Cg4ZB72 | Welcome Home | chronicle | 1 |
| i-k6jGzSq | Western Politicking | chronicle | 1 |
| i-k4b6c5b | What Remains | chronicle legend | 33 |
| i-WxQjxQS | What Remains | chronicle | 1 |
| i-Pd3vWBk | What She Guards | chronicle | 2 |
| i-pmdsNRZ | When Pretend Narrows | chronicle | 1 |
| i-G7vCDcw | Where He Finally Rests | chronicle | 2 |
| i-zHvS5jz | Where the Herd Finds Water | chronicle | 1 |
| i-nnV6qtS | Where the Trail Speaks | chronicle | 2 |
| i-vP376vx | Who Goes There? | chronicle | 1 |
| i-FnZ68h3 | Who is Here? | chronicle legend | 24 |
| i-8rx6BzZ | Winter Blues | chronicle | 3 |
| i-7d3jWrb | Wintered | chronicle | 25 |
| i-jRxNbgX | With Reverence and Intent | chronicle | 31 |
| i-xr5chJG | Working the Slope | chronicle | 1 |
| i-3V4rCN8 | Worn to the Bone | chronicle | 1 |
| i-8Ddjt5W | Worth Every Mile | chronicle legend | 1 |
| i-6BgfRxb | Worth the Bend | chronicle | 1 |
| i-JKnW497 | Wounded: Blood on the Bandolier | chronicle | 1 |
| i-69qsFwx | Young Warrior | chronicle | 15 |

## Local artifacts

Raw before/after HTML and independent layer snapshots: `.cache/sketch-lingo/before/` and `after/`. Full 53 landing responses: `.cache/sketch-lingo/landings/`. Browser evidence: `.cache/sketch-lingo/browser-report.json`. All 54 /all regression snapshots: `.cache/gateway-copy/lingo-regression/`. No pricing amounts, stored tier assignments, product offer policy, merchant feed, or -sketch routing were changed in this packet.


## Body-copy follow-up

Wayne identified a missed Western Wall Art body paragraph after initial review. The initial checks covered gateway paragraphs but did not enforce the pricing rule across all other body copy. That paragraph now uses the exact /all limited-first ladder and retains a separate Engrained availability sentence. Shared collection introductions, concept/collecting paragraphs, closing context copy, and FAQ answers now apply the same rule on the 13 requested doorways.

A fresh scan of all 48 shared doorway/hub pages found 10 old pricing paragraphs, all corrected. No unqualified $25-leading prose remains in their paragraph/list copy; the explicit Sketch size/price rows and Open labels remain accurate. 7 revised FAQ answers were checked against their served JSON-LD equivalents. All 52 description layers remain unchanged from the reviewed packet. Actual desktop/mobile rendering of the paragraph in Wayne's screenshot passed. Localhost:8888 remains running; no production build, push, or deployment.
