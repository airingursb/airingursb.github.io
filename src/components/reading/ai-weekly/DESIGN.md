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
