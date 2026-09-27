# AI 趋势周刊 · Entry & archive

Extend the root reading-stream design system. Keep the existing SiteHeader, 1200px shell, 48px/20px gutters, neutral light/dark theme, serif editorial headings, system sans body, and mono issue metadata.

## Intent

The reading stream is the daily collection; the shelf is its edited weekly edition. Place the shelf immediately after the reading hero, before filters and cards. Use a compact latest-issue feature plus a visible archive link. The archive is a growing, year-grouped collection of real covers. Start with the approved issue 001 only; no invented back issues or empty mock covers.

## Tokens and primitives

- Consume `--c-bg`, `--c-bg-alt`, `--c-text`, `--c-text-muted`, `--c-border`, `--accent`, `--font-mono` from the site. Do not introduce a competing palette.
- Local tokens: serif editorial stack; spacing 8/12/16/24/32/40/48; metadata 12px, copy 14–16px; action targets at least 44px.
- `IssueCover` renders the real cover as an image with intrinsic 540×960 dimensions. It is an illustration of the publication, not a raster substitute for navigation or page UI. Text, metadata, titles, contents and links remain real HTML.
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

Place one full-width latest-issue card immediately before the daily Reading Stream card on `/`. This keeps the edited weekly perspective adjacent to its daily source. Reuse the homepage's neutral `.card` surface, 8px radius and 24px padding (20px on mobile), with the existing `IssueCover`, `IssueTitle` and weekly action primitives. The cover is 118px wide on desktop and 80px at 480px and below; never crop it. Use the shared 8/12/16/24px spacing, 12px metadata, 14px description/actions, and 28px desktop / 21px mobile serif issue heading. The publication name uses the existing 14px UI scale. No new colors, shadows, decorative motion or client-side dependencies.

The typed catalog owns the latest issue, localized covers and links, title, coverage dates and reading count. Show the publication name, “每周一更新 / Every Monday”, issue number, full coverage range, topic-bearing deck, read action, archive link and the existing weekly subscription dialog. The homepage's language control sets the root `lang`; CSS exposes only the corresponding complete locale. Hidden locale content must not enter the accessibility tree. Cover images stay native-lazy with intrinsic dimensions. Mobile keeps the cover beside the title, then puts the deck and actions across the full card width. Native actions have 44px targets and visible focus. No nested interactive elements.

Keep a topic's name together wherever it appears in the deck, using the catalog's own localized topic titles as phrase boundaries. Do not hardcode issue-specific words in the component or change the editorial description to fit a single viewport.

Personas: a new visitor discovers the weekly publication; a returning reader opens the latest issue; an English reader follows English routes; a mobile or keyboard reader reaches reading, archive and subscription without hover. Verify all at 375/768/1280px in both themes, including real navigation and opening/closing the existing dialog without submitting an email. Other homepage modules and their existing performance/network limitations are outside this small entry change.

## Publication calendar

Use UTC+8 save dates: Sunday 00:00 through Saturday 23:59:59 inclusive. Reserve the following Sunday for editing; publish on Monday. Issue 001 covers 2026-09-20–2026-09-26 and is dated 2026-09-28. Issue 002 will cover 2026-09-27–2026-10-03 and be dated 2026-10-05. Show the coverage range and publication date; do not add a separate collection-cutoff notice. The typed catalog supplies archive, RSS and email dates. Related saves of the same original may share a column: retain every Reading Stream URL in `relatedSources` and the article, and count saved reads separately from columns. Issue 001 represents 17 saved reads in 16 columns.
