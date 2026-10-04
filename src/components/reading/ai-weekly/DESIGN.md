# AI 趋势周刊 · Entry & archive

Extend the root reading-stream design system. Keep the existing SiteHeader, 1200px shell, 48px/20px gutters, neutral light/dark theme, serif editorial headings, system sans body, and mono issue metadata.

## Intent

The reading stream is the daily collection; the shelf is its edited weekly edition. Place the shelf immediately after the reading hero, before filters and cards. Use a compact latest-issue feature plus a visible archive link. The archive is a growing, year-grouped collection of real covers. Start with the approved issue 001 only; no invented back issues or empty mock covers.

## Tokens and primitives

- Consume `--c-bg`, `--c-bg-alt`, `--c-text`, `--c-text-muted`, `--c-border`, `--accent`, `--font-mono` from the site. Do not introduce a competing palette.
- Local tokens: serif editorial stack; spacing 8/12/16/24/32/40/48; metadata 12px, copy 14–16px; action targets at least 44px.
- `IssueCover` renders the complete A4 cover (`210 / 297`) with intrinsic 540×764 dimensions. Localized share images are 1080×1528. Both are exports of the same real HTML cover, recomposed at 540×763.714 rather than stretched from the old portrait. It is an illustration of the publication, not a raster substitute for navigation or page UI. Text, metadata, titles, contents and links remain real HTML.
- Paper edges and a narrow book spine are the only dimensional decoration; no card shadows, gradients, animated books or wood textures. A thin shelf rule joins the cover to its surrounding layout.
- Shared cover, metadata and action styles are used by both entry and archive. New issues come from one typed catalog.

## Layout and states

- Desktop entry: small portrait cover beside issue title/deck/metadata, compact enough to retain the daily feed nearby. Archive: cover-led issue row with editorial summary and genuine theme links.
- 720px breakpoint: cover and readable title stay together; supporting metadata and actions reflow. No horizontal page overflow at 375px. All covers preserve their complete aspect ratio.
- Light/dark surfaces follow site tokens. Printed cover colors remain unchanged.
- Native links, visible focus outline, underlines on actionable text, no custom motion or JavaScript needed. No hover movement or fake filters for a one-issue collection.
- Use full date ranges and editor attribution. Mark the approved first issue as a trial edition. Both locales open the corresponding complete edition; language controls preserve the current issue and section.

## Subscription and loading

- Lead subscription with AI Trends Weekly: a compact invitation beside the latest issue, an archive invitation, and a quiet end-of-issue invitation. Describe the delivery as a cover, themes and a link to every column. Send only when an edited issue is published.
- Reuse the site's subscription dialog, with weekly email selected on weekly/reading surfaces. Weekly RSS is separate from the daily Reading Stream RSS; retain the latter as an explicit option.
- Read twelve cards at a time, keeping source/month filters global. Native image lazy loading remains; later batches are hidden until requested. Show matched and displayed counts, a 44px load-more action, and a complete no-JavaScript fallback.
- English uses the same editorial typography, illustrations and information hierarchy. Translate captions, controls and accessibility text as well as all sixteen articles; preserve source artwork.

## Verification

Open both locales at 375/768/1280px and check both themes. Follow reading → archive → issue → reading. Verify the original source/month filters still work, theme and locale controls work, and share links use the actual preview or production origin. Retain all 16 existing detail columns and original imagery.

## Personal homepage entry

Place one full-width latest-issue card immediately before the daily Reading Stream card on `/`. This keeps the edited weekly perspective adjacent to its daily source. Reuse the homepage's neutral `.card` surface, 8px radius and 24px padding (20px on mobile), with the existing `IssueCover`, `IssueTitle` and weekly action primitives. The cover is 168px wide on desktop and 80px at 767px and below; never crop it. Use the shared 8/12/16/24px spacing, 12px metadata, 14px description/actions, and 24px desktop / 21px mobile serif issue heading. The publication name uses the existing 14px UI scale. No new colors, shadows, decorative motion or client-side dependencies.

The typed catalog owns the latest issue, localized covers and links, title, coverage dates and reading count. Show the publication name, “每周一更新 / Every Monday”, issue number, full coverage range, topic-bearing deck, read action, archive link and the existing weekly subscription dialog. The homepage's language control sets the root `lang`; CSS exposes only the corresponding complete locale. Hidden locale content must not enter the accessibility tree. Cover images stay native-lazy with intrinsic dimensions. Mobile keeps the cover beside the title, then puts the deck and actions across the full card width. Native actions have 44px targets and visible focus. No nested interactive elements.

Keep a topic's name together wherever it appears in the deck, using the catalog's own localized topic titles as phrase boundaries. Do not hardcode issue-specific words in the component or change the editorial description to fit a single viewport.

Personas: a new visitor discovers the weekly publication; a returning reader opens the latest issue; an English reader follows English routes; a mobile or keyboard reader reaches reading, archive and subscription without hover. Verify all at 375/768/1280px in both themes, including real navigation and opening/closing the existing dialog without submitting an email. Other homepage modules and their existing performance/network limitations are outside this small entry change.

## Publication calendar

Use UTC+8 save dates: Sunday 00:00 through Saturday 23:59:59 inclusive. Reserve the following Sunday for editing; publish on Monday. Issue 001 covers 2026-09-20–2026-09-26 and is dated 2026-09-28. Issue 002 will cover 2026-09-27–2026-10-03 and be dated 2026-10-05. Show the coverage range and publication date; do not add a separate collection-cutoff notice. The typed catalog supplies archive, RSS and email dates. Related saves of the same original may share a column: retain every Reading Stream URL in `relatedSources` and the article, and count saved reads separately from columns. Issue 001 represents 17 saved reads in 16 columns.

## Opening spread and homepage alignment

The issue detail uses two equal columns at 1280px and above; the A4 cover sets the natural row height and the editorial desk stretches to the same top and bottom. The desk keeps all copy visible: four facts in a two-column grid with 12px outer spacing, a 28px heading at 1.4 line-height, a 16px introduction at 1.75, and 14px guide copy at 1.75. The 44px contents and share controls share a row, with the cover-story link below. Source attribution stays at the bottom through flex free space, with its source link and credits side by side at 12px/1.6, never fixed-height clipping. At 1279px and below, stack cover then desk; retain normal mobile/tablet reading sizes.

The homepage cover spans its three content rows at 168px wide. Metadata/title, a vertically centered summary and bottom-aligned actions use the same row as the complete cover. Metadata bottom spacing is 8px, with a 24px heading and a 14px summary at 1.65. At 767px and below, the 80px cover sits beside the title block while the summary/actions span the card. Both actions use matching 44px targets, 8px icon gaps, 12px horizontal padding and 4px radius: filled neutral read action and a neutral outlined subscription action. No persistent underline or orange rule; hover and keyboard focus remain visible. Preserve all existing routes and subscription attributes.

## Social link cards

Link crawlers receive a dedicated 1200×600 JPEG (2:1), generated at build time with the existing Satori/Resvg/Sharp stack and local fonts. The whole localized A4 cover sits at the left, contained rather than cropped; the right presents the localized publication name, issue title, a short topic deck, issue number, coverage dates and Airing/ursb.me attribution. Issue text and assets come from the catalog. Use the print palette: paper `#f6f2e8`, ink `#252a27`, muted `#67675d`, accent `#a74432`, rule `#d7d1c3`. Use Noto Sans SC for readable display/body text beside the serif publication artwork, with JetBrains Mono for dates and issue numbers. The OG scale is 20/24/32/52px, with 48px outer space, a 40px column gap, 12/24px internal gaps and 20px above the footer. No new illustration, decorative motion or client script.

A4 cover downloads, shelf imagery, RSS and email retain their existing portrait assets. Social metadata is rendered in the initial HTML, one value per field: canonical URL, title/description, localized landscape image, dimensions/type/alt, locale, summary_large_image and Airing attribution. New image path/version prevents reuse of the old portrait image URL. X controls its own card cache and final rendering; test real publicly accessible responses and any available X preview without publishing a post. Static cards must be readable at desktop and phone link-preview scale; no clipped text or missing glyphs. No known design/accessibility debt is accepted.

## Share image delivery

The dialog uses a dedicated 864×1222 WebP preview (quality 82), loaded lazily. The save-cover action retains the original 1080×1528 PNG; social crawler metadata keeps its separate landscape image. After exporting cover PNGs, run `node scripts/optimize-weekly-share-previews.mjs` to regenerate both locale previews. Compression resizes the preview only and does not overwrite originals.

## Issue 002 editorial preview

- A standalone, noindex preview at `/previews/ai-weekly-002/` and its English counterpart; draft data stays outside the published issue catalog, feeds, subscription jobs and homepage.
- Preserve the A4 magazine cover, paper/ink/brick/forest palette and Airing bear identity. New artwork is an editorial concept illustration, distinct from attributed original project frames.
- Every saved reading has one editorial home. Use six mechanism-led features, a compact ten-product shelf, and short field notes/creative references/news. Product announcements do not become long reports by default.
- Feature diagrams use semantic ordered steps, captions and HTML comparison panels. They explain mechanisms without inventing measured performance. Original frames retain intrinsic aspect ratio and source links.
- Product cards use plain text category labels, name, concise function, use case and one relevant caveat. Their visual weight stays below feature headlines. Sources remain individually linked, including two readings grouped in the Maestro card.
- Existing type tokens are retained; new Chinese copy uses the installed Noto Serif SC font package with Unicode-range loading rather than the issue 001 character subset.
- Preview facts: period 2026-09-27–2026-10-03; planned publication Monday 2026-10-05; snapshot contains 45 saves. Savings are attributed anecdotes; partial newsletters are labeled; analysis is editorial interpretation. No subscriber delivery is initiated by preview creation.

## Issue 002 depth and visual revision

The first draft overused one horizontal step-list primitive. Issue 001 instead paired mechanisms with original evidence, comparisons, metric ledgers and distinct composition. Preserve the cover and concise product shelf; deepen only the six selected mechanisms.

- Interleave evidence with the paragraph it supports. Each mechanism has a specific visual grammar: branched picture/sound pipeline; synchronized cue timeline; archive/current-context comparison; crash and recovery branches; event-interception sequence; cost equation and routing decision tree; held-out benchmark bars and a train/test loop.
- Use real source frames and research figures with source links, descriptive captions, native aspect ratios, lazy loading, and a direct full-size image link. Do not give all figures the same height or a letterboxed container.
- Annotated examples are explicitly editorial examples. Frame counts and amortized costs are labeled editorial calculations. Measured results retain workload, denominator, model/harness, units and provenance; illustrative thresholds and timelines never appear as measured results.
- Add short inline highlights to the argument, rather than only one pull quote above each article. In longer features, a narrow reading rail can explain a term, give a concrete case, or show a source alongside readable prose. Collapse to reading order on mobile.
- Paper palette, type scale and spacing remain unchanged. Diagram text stays real HTML; simple SVG connectors are decorative and hidden from assistive technology. No new runtime dependency, automatic video downloads, artificial performance animation, or motion is required to understand the mechanism.
- Product cards remain below 160 Chinese characters and each source keeps one editorial home. English retains the same examples, figures, calculations and depth.

## Issue 002 illustrated storyboard refinement

The approved cover is the character and medium reference: warm brown teddy bear, cream muzzle and ear interiors, pink cheeks, muted forest green / brick / honey, handmade matte gouache and warm paper grain. Replace the four geometric storyboard drawings with individually generated narrative frames. The bear's actions must carry the explanatory change: hesitation, repeated log burden, complete archive with a small working set, and checking a summary against an original. Production and interruption examples receive two companion scene illustrations in this same medium.

- Reusable `DraftIllustration` loads local WebP at 480 or 960px through native `srcset`, with intrinsic 3:2 dimensions, translated descriptive alt text, lazy loading, and a native full-size link. Original generated PNGs and exact prompts stay in the working output directory, outside the web payload.
- `IllustratedStoryboard` uses two columns above 700px and one full-width column below it. Artwork remains 3:2 and uncropped; shot numbers, cue times, speech and explanation stay real HTML. Use existing 12 / 14 / 18 / 22px type and 8 / 12 / 16 / 24 / 32px spacing. No tiny 112px art thumbnails on phones, text embedded in pictures, or decorative image animation.
- The storyboard sits directly on the paper surface rather than inside a second bordered inset. The three proportional timing tracks follow it and retain their actual 0–3 / 3–15 / 15–32 / 32–45-second spans.
- `IllustratedMechanism` pairs a 1.4fr illustration with a 1fr HTML explanation above 1100px; below that, reading order is picture then explanation. Production uses a compact vertical list of tracks; recovery keeps the actual state branches separate from the concept art.
- Uncertain recovery and the permission checkpoint use the existing highlight wash with neutral rules and a clear glyph / label. Do not add colored state outlines. Benchmark bars, original source figures, units and denominators remain data-driven HTML and attributed source artwork.
- Generated pictures are explicitly editorial concepts, never original project output or benchmark evidence. Both editions share the same artwork and receive localized captions. Page QA covers both locales at 375 / 768 / 1280px, source coverage, image proportions, enlargement and keyboard focus. No accepted accessibility debt; generated artifacts contain no essential in-image text.
- Use inline-block phrase boundaries in the production and recovery headings so small-screen wrapping keeps “时间轴” and “回执” with their clauses. Their complete localized text stays selectable HTML; no fixed-height clipping or forced line break on desktop.
- Routing connectors have no fill and a 1px non-scaling stroke in the existing rule color. Their 32px height uses the spacing token; hide the two-way connector below 700px, where the labeled alternatives stack. Keep decorative SVG paint attributes explicit so a missing shared style cannot turn an open path into a black polygon.
- Reuse the phrase-boundary primitive in the Chinese routing heading and authorization note; keep “把判断和行动分开” and “高置信度不授予行动许可” intact on phones. English continues to use normal word wrapping.

## Issue 002 official product-image shelf

Use genuine product website artwork, screenshots and project demos for all ten tools. Keep each product's own brand and UI; do not use generated bear scenes for the product catalog. The six explanatory bear illustrations elsewhere in the issue remain editorial concepts.

- Preserve the two-column catalog, concise copy, and all eleven product reading sources. Product title links stay unchanged.
- `DraftProductImage` owns an explicit one-to-one relationship between product and official image. Store the source page, original asset URL, image kind and bilingual alt text. A short linked caption distinguishes official screenshots, official artwork, demo frames and website captures.
- Crop each original to 3:2 with a reviewed focal region. Never distort, redraw, recolor or invent UI. White is the compositing background for transparent source material. Keep the original dimensions/aspect ratio in a separate uncropped enlargement file.
- Deliver local 960×640 and 480×320 WebP derivatives through native `srcset`, intrinsic dimensions, lazy loading and async decoding. Budget each large thumbnail below 180 KB and each small thumbnail below 60 KB. Downloaded originals and capture evidence stay outside the website payload.
- Reuse the existing `tool-head` title/image arrangement: side by side above 1100px, stacked below. Keep the 700px catalog breakpoint and existing typography, color and spacing tokens. Image credit links use the existing understated source treatment and visible keyboard focus. No additional runtime dependency or motion.
- If a website offers its demo as HTML rather than a downloadable picture, capture the untouched public presentation and credit it as a website screenshot. Do not use blank video posters or broken OG assets. Review the subject, logo and text boundaries in each crop; open the complete uncropped image on selection.
- Both editions use the same ten official images with localized captions and alt text. QA covers all cards at 375 / 768 / 1280px, crop proportions, source credits, enlargement, focus and unchanged 45-item editorial coverage.

## Issue 002 Pi Agent 1.0 release feature

Make Pi 1.0 explicit in the engineering contents, cover teaser and the existing recovery feature. Retain the `durable` anchor and the three saved-source homes; official release material is supporting evidence, not an extra saved reading or a duplicate product card.

- `PiReleaseRoutes` compares the released terminal coding agent with the separate experimental Pi Durable framework. Reuse the exhibit, paper inset, rule, forest label, 18 / 22px heading and 12 / 14px copy primitives. Two equal columns use the existing 20px gap and padding; below 700px they stack in reading order. Status is written in real HTML, not implied by color.
- An attributed capture of the official terminal recording sits next to a reading rail explaining the custom Claude / Jev / GPT router. Reuse `DraftFigure` and `trace-reading`: preserve the capture's natural aspect ratio, lazy loading, native full-image link and visible source credit. Below 1100px, image and rail stack. No embedded player or automatic recording download.
- Label the router as an extension demo, not the default agent policy or a Durable recovery demo. Separate the September 29 version 0.99 additions from the October 1 version 1.0 refinements. Any token reduction retains its model/configuration scope rather than becoming a task-cost claim.
- Preserve the existing recovery illustration and mechanism analysis. Distinguish community compatibility feedback from release facts. Check both editions at 375 / 768 / 1280px, the official image and reference links, keyboard enlargement, and all 45 saved readings.

## Issue 002 publication

Publish the approved bilingual reader at `/reading/weekly/002/` and `/en/reading/weekly/002/`. Preview aliases remain noindex and outside search. Preserve the Sunday–Saturday reading range and Monday 2026-10-05 edition date; website release does not call a mail-sending endpoint.

- Reuse the complete approved layout through one edition component with a preview flag. Publication adds canonical/hreflang/OG/X/RSS metadata, a desk share action and a closing subscription invitation using the existing paper palette, 14px actions, 44px targets and 12 / 16 / 24 / 32px spacing.
- Export each localized cover as 1080×1528 PNG; keep optimized shelf WebP and 864px share previews separate. Landscape 1200×600 crawler cards reuse the established social renderer. Generated concept art and official product images retain their distinct credits.
- The newest issue leads the archive, reading shelf and homepage. Historical issue 001 selects its own metadata explicitly; only issue 001 carries the pilot label. Covers describe each issue's own headline in alt text.
- Twenty-nine editorial units expose stable `column-NN` anchors alongside their readable topic/feature IDs. Topic counts in the published email catalog count editorial units; the reader's directory counts all 45 saved readings. Both remain explicit and consistent with existing scheduler validation.
- Share uses a native dialog with visible keyboard focus, focus restoration, Escape/backdrop close, selectable canonical URL, copy feedback, full PNG download, X/Threads intents and native sharing when supported. No essential content depends on an external social SDK.
- Existing weekly telemetry records the publication number, locale, source, column, topic navigation, image enlargement, share result and scroll depth. Preview browsing does not initialize weekly telemetry. Subscription opens and RSS links reuse the established dialog and attribution.
