# Airing's Blog Design System

## Homepage interactive bear

`/` displays the interactive bear; `/previews/bear-home/` remains a noindex alias. Preserve
the existing mono typography, neutral cards, green accent and weather/reader row.
Use a compact desk vignette rather than a hero banner: 232px wide on desktop,
200px on mobile, centered above metadata with an 8px gap. No illustration title,
frame or extra marketing copy. The illustration is decorative, with empty alt text;
real text and controls remain DOM. Only the preview alias carries noindex metadata.

The bear uses one H3-authored typing/look-up/blink loop, 140 frames at 12 fps.
The generated white matte is removed offline; static props are locked to the first
selected frame. Use a transparent PNG poster while loading and on atlas failure.
Keep the same dimensions on light/dark themes with no blend mode. Canvas uses the
232×136 logical sprite grid with pixelated scaling. No visible playback toolbar or
activity menu, including on hover or touch. Pause while offscreen or in a background
tab. Reduced motion keeps interactions on static poses. No audio.

Daily V2 adds reading and sleeping activities, plus head-pat, sip and waking
reactions. Retain the same 232×136 stage and desktop/mobile dimensions. Each
reading/sleeping activity has an entry, quiet hold and exit; complete prop placement before the
next clip starts. Typing starts in the neutral desk pose and completes the current
gesture at 2× speed to the next authored neutral checkpoint before switching.
The sleep exit is the authored waking action. Schedule changes
only after 45–90 seconds of visible playback, biased to sleep at 23:00–07:00
Asia/Singapore. This is the mascot's fictional routine, not live author presence.

Reading V10 corrects the book's geometry throughout entry, page turn and exit:
the sage exterior and spine face the visitor, the inside pages face the bear.
A single turning leaf may lift above the book, but stays behind the green cover;
the inner spread must never replace the viewer-facing exterior. Preserve the
fixed camera and complete book-put-away action. The book sits beside and behind
the laptop; its invisible preview target spans 33–56% of the stage width to match
the visible cover, without moving the laptop's central click target.

The reaction heart uses `--bear-heart: #d89987`, sampled from the bear's warm cheek
palette. Head, mug, laptop and plant are semantic transparent buttons with at least 44px targets;
Keyboard focus uses the existing accent token; hover does not draw a button outline. A head pat emits one
small pixel heart; sleeping head activation wakes it. Mug requests a sip, laptop
requests typing. Repeated requests are coalesced; actions never build a queue.
Daily activities change automatically. Interacting resets the routine timer but
never permanently disables the routine. Only the head, cup, laptop and plant are interactive
targets; retain their accessible names and keyboard Tab/Enter/Space activation.

Interactions show no captions or native title tooltips. Feedback is the bear's
motion; accessible names and a visually hidden live region support screen readers.
A single activation requests the action; no second tap on text is required.
Reduced motion selects still reaction poses without autoplay. Resource failures
preserve the current bear and announce retry feedback only to screen readers.
Load new atlases on demand and keep a
bounded decoded cache; no generation requests or audio in the browser.

Second batch adds a headphones listening activity and three one-shot reactions:
stretching, watering the existing sprout, and a shy response to repeated petting.
Music is a silent fictional activity, not synchronized with a live audio player.
The bear puts headphones on before the held listening loop and removes them before
another clip starts. Stretching happens occasionally in the daytime routine and
returns to the selected activity. The plant is a fourth transparent, keyboard-named
44px hotspot; it requests one watering action. Keep the plant and laptop targets
separate at the 200px mobile stage width. Watering returns to the selected activity.
Three head activations within five seconds request shyness; ignore further head
activations for eight seconds to prevent a chain of reactions. Waking a sleeping
bear resets the pet streak. All four new poses honor reduced motion, no captions,
no native tooltips and the existing on-demand atlas cache. Arms and ear/headphone
extremes must fit the stage without cropping; watering must not duplicate the mug.

This contract covers the editorial surfaces under `/reading/` and the shared site header. Other long-lived sections retain their local content systems.

## Singapore bear life

The existing compact pixel desk remains the visual reference. Keep the 232px desktop / 200px mobile width; reserve 40px below a 160px sprite stage (24px extra umbrella headroom above the original 136px art) for a low wooden stool and two content keepsakes so 44px targets never overlap the mug/laptop/plant. A small sage desk lamp sits left of the bear and behind the mug. No scene frame, headings, captions, tooltips or activity menu.

Singapore time drives the initial pose and subsequent routine: 07–11 coffee, 11–14 work, 14–18 reading, 18–23 a quiet evening, 23–07 sleep. The lamp glows 19–07 in either site theme; it can be toggled directly without changing the site theme. Time is fictional mascot routine, never an author-presence claim. Rain/thunder from the existing weather request takes priority only while observed data is at most 45 minutes old. Missing/stale weather returns to the clock routine. No extra weather API or indefinite cache inference.

New articles leave one cream envelope and new travel-photo uploads leave a charcoal camera keepsake beneath the desk. Each is a real anchor directly to the latest valid local article/photo route, with a descriptive accessible name and no visible words. Article publication / photo first-publication dates expire after 14 days; the build snapshot itself expires after seven days. Future dates and missing dates do not qualify. A travel place outside Singapore or explicit travel tag qualifies; missing geography is not invented. An arriving camera activity plays once per page when fresh travel content is present, then routine resumes. Older photos do not imply a current trip.

H3 supplies coffee/umbrella/camera authored enter–hold–exit clips; existing reading/sleep clips remain. Lighting, sparse rain, envelopes and resting camera props are programmatic pixel scene layers. Props palette: outline #48382d, sage #91ac89, cream #f4e2b9, lamp warmth #f6d58c, rain #88a6b2, camera #55565c, stool wood #cba574. Lamp glow uses a 240ms opacity transition; reduce-motion has no transition. Rain moves in four discrete steps at 1.6s, at most six drops, contained to the scene and paused offscreen/background/reduced-motion. Content links appear without pulsing; native keyboard focus uses existing accent.

Interaction reference: beui.dev switch source, read 2026-09-13; reuse semantic pressed state and zero-duration reduced-motion path, adapting to a pixel lamp rather than installing Motion. Novel authored sprite transitions retain the existing complete-prop-exit state machine. Respect the same cache, transparent poster and asset-failure fallback.

## 1. Atmosphere & Identity

Reading feels like a personal editor's desk: quiet, opinionated, and easy to scan. The signature is the contrast between compact mono metadata and generous editorial passages, separated by printer-like rules rather than floating cards. The daily stream records; the weekly edition interprets.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| Canvas | `--c-bg` | `#ffffff` | `#0d1117` | Page background |
| Secondary surface | `--c-bg-alt` | `#f6f8fa` | `#161b22` | Quiet callouts and image fallback |
| Primary text | `--c-text` | `#1f2328` | `#e6edf3` | Headlines and body |
| Secondary text | `--c-text-muted` | `#656d76` | `#7d8590` | Decks and descriptions |
| Tertiary text | `--c-text-dim` | `#8b949e` | `#484f58` | Metadata and captions |
| Rule | `--c-border` | `#d8dee4` | `#21262d` | Structural dividers |
| Strong rule | `--c-border-light` | `#d0d7de` | `#30363d` | Emphasized editorial boundaries |
| Action | `--accent` | `#16a34a` | `#4ade80` | Links, focus, active state only |

### Rules

- Color never substitutes for hierarchy: type, whitespace, and rules establish the page structure.
- The accent is reserved for actions, focus, and the current location. It is not decorative fill.
- Reading surfaces use the global light/dark theme variables; no local raw colors are introduced.

## 3. Typography

| Level | Size | Weight | Line height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| Display | `clamp(2rem, 4.5vw, 3.5rem)` | 600 | 1.25 | `-0.035em` | Weekly thesis |
| H1 | `2.5rem` | 800 | 1.05 | `-0.04em` | Reading page title |
| H2 | `1.75rem` | 600 | 1.2 | `-0.025em` | Editorial section title |
| H3 | `1.125rem` | 650 | 1.35 | `-0.015em` | Story title |
| Lead | `1.125rem` | 400 | 1.75 | `0` | Deck and editor's note |
| Body | `1rem` | 400 | 1.8 | `0` | Recommendations and supporting copy |
| Small | `0.75rem` | 500 | 1.5 | `0` | Compact UI |
| Meta | `0.75rem` | 500 | 1.5 | `0.04em` | Labels and timestamps |

### Font stacks

- UI and story titles: `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`.
- Editorial display and long-form notes: `ui-serif, "Songti SC", "STSong", Georgia, serif`.
- Metadata: the site-level `--font-mono` stack.

### Rules

- The serif face marks authored editorial judgment; generated metadata and navigation remain sans or mono.
- Weekly body text is 16px; actionable labels are at least 14px and metadata is at least 12px.
- Chinese display lines use balanced wrapping where supported and avoid one-character orphan lines.

## 4. Spacing & Layout

All intentional spacing uses a 4px base.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | `4px` | Tight inline gap |
| `--space-2` | `8px` | Metadata clusters |
| `--space-3` | `12px` | Label-to-content |
| `--space-4` | `16px` | Compact component padding |
| `--space-5` | `20px` | Mobile page gutter |
| `--space-6` | `24px` | Story spacing |
| `--space-8` | `32px` | Component groups |
| `--space-10` | `40px` | Section separation |
| `--space-12` | `48px` | Desktop page gutter |
| `--space-16` | `64px` | Major editorial break |
| `--space-20` | `80px` | Weekly hero rhythm |

- Reading content caps at 1200px, centered, with 48px desktop and 20px mobile gutters.
- Archive pages prioritize the latest edition with its theme, cover and three topic links. Workflow explanations live in documentation, not the reader-facing page.
- Issue pages use a readable main column and topic introductions; an in-page contents row lets readers jump to a topic. Supporting stories use small thumbnails on mobile, while the lead keeps its full illustration.
- Page gutters remain symmetric. Weekly pages use the same shared masthead and site-level theme switch as other sections.
- Breakpoints follow the existing Reading surfaces: mobile at 720px, tablet at 1020px, wide layout above 1020px.

## 5. Components

### Shared site header (`SiteHeader.astro`)

- **Structure:** 4px top rule, brand/navigation row, metadata/language row and 1px bottom rule. Every published blog-style page uses this component; page-specific metadata is slotted, never a copied navigation list.
- **Tokens:** 1200px shell, 48px desktop / 20px mobile gutters, 24px top margin, 14px bar padding, 16px navigation gap. Brand and navigation use the site sans stack at 11px / 1.5; brand weight 600 and tracking .12em, links weight 400 and tracking .06em. This preserves the existing Moments masthead rather than Reading's separate mono brand and active underline.
- **Navigation:** Blog, Moment, Notes, Reading, Photos, Friends; locale-aware paths with trailing slashes. Photos is a shared English-only route. Comics keeps its contextual Archive/Comics links. Nested routes highlight their parent section.
- **States:** current section, hover, keyboard focus.
- **Accessibility:** landmark navigation, `aria-current`, visible focus, 44px mobile menu and link targets, Escape closes the menu and restores focus. The no-JavaScript fallback exposes the navigation.
- **Motion:** color changes only, 150ms.
- **Layout:** centered shell; at 768px and below a menu exposes all links, including Reading. Page-specific mottos hide below 1100px to avoid overlapping navigation. Weekly pages use the same header and normal site theme-toggle placement.

### Edition link

- **Structure:** issue number/date, thesis, short deck, story count, directional label.
- **Variants:** featured latest edition and compact archive row.
- **States:** default, hover, active, focus-visible.
- **Accessibility:** cover, title and reading action have descriptive link names; topic links jump to the corresponding section.
- **Motion:** interactive text and border color changes only.
- **Layout:** split editorial grid, one column on mobile.

### Weekly story

- **Structure:** responsive cover, mono source label, title, editor recommendation, source link.
- **Variants:** lead story and numbered supporting story.
- **States:** default, hover, focus-visible, missing-image fallback.
- **Accessibility:** useful alt text, explicit source link, 44px touch targets on mobile.
- **Motion:** no image zoom; link color changes only.
- **Layout:** lead split view or rule-separated list row.

### Editor's note

- **Structure:** section label, authored text, signature.
- **Variants:** full issue note and short archive rationale.
- **States:** static content only.
- **Accessibility:** semantic heading and paragraph; line length capped for reading.
- **Motion:** none.
- **Layout:** sidebar on wide screens, full-width inset on narrow screens.

### Reading action

- **Structure:** text button or link with hard 1px outline; the primary subscription action uses an inverted neutral fill.
- **States:** default, hover, active, focus-visible, disabled.
- **Accessibility:** minimum 38px desktop and 44px mobile hit area; purpose stated in copy.
- **Motion:** color and border-color only, 150ms.
- **Layout:** inline cluster that wraps on small screens.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 150ms | ease-out | Link and button response |
| Standard | 200ms | ease-in-out | Existing Reading image feedback |

- Motion communicates clickability only. Static editorial regions do not animate on entry.
- Only `transform`, `opacity`, color, background-color, and border-color may transition.
- `prefers-reduced-motion: reduce` removes translation and image effects.

## 7. Depth & Surface

The Reading depth strategy is **borders-only**. Thin rules express grouping; the 4px masthead rule is the strongest boundary. No card shadows, gradients, glass, or raised panels. Covers supply the visual color; interface chrome remains neutral.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA: 4.5:1 body contrast, 3:1 large text, visible focus, keyboard reachability, and semantic landmarks.
- The weekly archive and issue must reflow without primary horizontal scrolling at 375px.
- CJK headings use balanced wrapping where available; editorial copy keeps comfortable line length and 1.65 or greater leading.
- Images declare dimensions or an aspect ratio to avoid layout shift.
- Both light and dark modes use the same semantic hierarchy.

### Accepted debt

| Item | Location | Why accepted | Owner / Exit |
| --- | --- | --- | --- |
| Other site sections have local, uncodified visual systems | Outside `/reading/` | This extraction is intentionally scoped to the requested weekly prototype | Codify when each section is next redesigned |
| Weekly issue data is a local editorial overlay | `src/data/reading-weekly.ts` | The UI is being validated before persistence and approval workflow changes | Move to a persisted issue record after product approval |

## Window bird visit timing

First visits use 20–40 seconds of cumulative visible daytime. Scrolling before arrival pauses earned time; background tabs pause pending and active visits. Leaving the viewport during an active visit releases the shared bird with the existing 3–5 minute cooldown. Fresh dry weather, open curtains and reduced-motion rules still apply. Consecutive Singapore calendar-day visits in the same browser shorten waiting to 10–20 seconds, retained on reload for that day. Store dates locally only; unavailable storage falls back to the ordinary wait. The authoring proxy alone marks birds with `data-bird-preview` for a three-second first wait and never writes visit history. No captions or new controls.

## Photo motion previews (September 2026)

The original review aliases reuse the real Photos and Blog pages: `/previews/photo-darkroom/`
and `/previews/living-cover/`. Both aliases are noindex; approved features are now also enabled on normal pages.
The darkroom entry sits beside the Photos heading with a 44px minimum target and
56px photographer bear. Its native modal follows the beui center-morph-modal
presence pattern (center transform origin, eased reveal, focus return), adapted to
native dialog and CSS with no React/Motion dependency. Use site neutral surface,
border and text tokens; the print alone uses `--print-paper: #f3efe3`,
`--print-ink: #38443a`. Spacing scale 8/16/24/32px. Opening 240ms, print turn 540ms,
photo developing 3200ms, easing cubic-bezier(.2,.8,.2,1). The real Shanghai photo
and its catalog metadata remain DOM; the H3 bear is a small transparent sprite,
not an image of UI. No generated location/date or added story. Close/Escape return
focus; flip remains available with reduced motion; failures show a readable state.

The living cover uses the existing monthly-36 artwork. Animate only sky above the
architecture, composed offline over the original cover so building/signs/people
remain exact. Keep cover size, title and link semantics. Desktop hover/focus plays
one quiet cloud cycle. On touch devices, a short visible dwell plays once; tapping
still opens the article. Pause offscreen/hidden, reduced motion stays on original.
The video is muted, lazy loaded, without controls. Cover transition snapshots use
the original still by hiding the motion overlay on navigation. No extra badges,
play buttons, audio or looping across the whole grid.

## Lost-page bear

The approved map-bearing bear is live at the actual 404 page and /en/404/.
The rejected article-picker experiment has been removed, including its routes,
component and public art. The 404 scene keeps a compact 144px visible sprite,
subdued mono 404, localized heading and native home/archive links. The first
reaction plays once in view; clicking replays it. English/Chinese links go to
the real localized error-page routes. A shared LostPage component owns layout,
copy and the same page-width SiteHeader, with no homepage flex-body inheritance.
Use existing surface/text/border/accent tokens, 8/16/24/32px spacing, 44px
interactive targets and visible keyboard focus. No captions, sound or controls.

The H3 atlas is lazy-loaded; elapsed playback pauses offscreen/hidden. Reduced
motion and media failure preserve the PNG poster; navigation works without JS.
Check every ear/map/hand extreme on dark and light backgrounds.

## Approved motion rollout

The photo darkroom is enabled beside the /photos/ heading, maintaining its
existing English-only Photos UI and real photograph metadata. The small cloud
moment is enabled on the monthly-36 cover in both /blog/ and /en/blog/. Approved
preview aliases remain noindex; production listing pages remain indexable.
Preserve the original cover-to-article transition and native Back navigation.

## Four bear stories — acceptance previews

The next batch consists of four independently reviewable stories: a gust at the existing desk (idea 1), a miniature place unfolding from a travel suitcase (5), a bear-operated project workshop (8), and a collectively tended footer garden (10). Idea 9, the physical-letter / DIY-postcard guestbook, stays deferred until the user accepts these four. Existing production pages remain intact during acceptance.

Keep the existing brown bear identity: dark brown stepped outline, warm brown fur, cream muzzle, coral cheeks, sage accessories. Scene materials use the established bear palette above. Match the editorial site's neutral surface/text/border tokens, 4px spacing grid, 1200px page shell and 20px mobile gutters. Use the existing SiteHeader and semantic buttons/links. One compact scene is the focus of each preview; no card dashboard, score, confetti, persistent instruction bubbles, playback toolbar, or automatic audio. Reviewer instructions belong outside the scene.

Each story has an authored entrance, an actionable stable situation, a character response, and a restful outcome. H3 provides character performance and material changes; program logic owns hit targets, user choices, real content links and persisted state. Use the original site's scene scale and crisp pixel rendering; an intentionally opened travel scene may expand within a bounded area. Preserve original photographs and exact text as DOM content, never regenerate them inside video.

Prefer real art and motion assets over procedural stand-ins. Asset failure and reduced motion retain a complete still with usable controls; offscreen/background work pauses. Touch and keyboard receive the same choices without mandatory hover or timed failure. Hotspots have accessible names, visible keyboard focus and 44px hit targets. New copy supports Chinese and English. Dark backgrounds must expose no white matte fringe, all extremities remain in frame, and responsive layouts must work at 375/768/1280px.

The shared garden must distinguish real shared persistence from an authoring simulation. Watering must be idempotent per visitor/day; growth follows persisted activity, not invented crowd numbers. Preview and production state are isolated. Any authoring shortcuts are visibly outside the scene and absent from production behavior.


### Bear stories revision 2: one room, one footer

The eventual homepage integration must retain the existing BearHomeStudy environment, laptop/lamp/curtain controls, and event ownership. New H3 action should occupy only its intended dynamic layer. The current revision remains an independent three-branch acceptance preview: two new clips failed locked-camera QC, and rigid crops of the original footage cut hands/ears or retained stray curtain pixels. Those experiments are not shipped. This revision repairs the original matte, pot and outward window geometry; it does not claim the homepage integration is complete. The existing daily-action videos can remain when a compatible event layer is authored.

Garden acceptance uses the real BearGardenFooter's optional scene/subscription slots. Its default production reading scene and subscription form remain unchanged; preview has one right-hand garden and one subscription destination. A larger farm and collectible plants are design proposals only. Reading-to-watering continuity across the two asset sets is not yet claimed.

Matte acceptance requires temporal dark/light edge inspection, preserving cream interior details and authored water/smoke. Lossless or measured near-lossless sprite encoding must not reintroduce a white matte. Stable scenery is independent from H3 performance, and fixed desk anchor metrics must distinguish camera correction from intentional character movement.

### Bear stories revision 3: one visit, one header scene

The full `/previews/bear-home/` route uses the same `index.astro` entry and page structure as the homepage. The header reserves exactly the original 232×160 artwork footprint plus its 40px lower space (200px-wide artwork on mobile). A visit chooses 10% wind story or 90% existing daily scene before mounting. Only the selected scene exists in the live DOM, so the other scene does not run or fetch atlases. Returning within a 30-minute visit keeps the choice; scrolling, theme/language changes, and tab visibility do not reroll. Review-only `?bear=wind` / `?bear=daily` selects a deterministic variant without overwriting the saved visit. Weather, online count, content cards and footer layout stay in their existing positions. No selection toolbar or transition between incompatible scenes during a visit. Both scenes retain the same original lower keepsake table, envelope and camera anchors. Their shared build snapshot and expiry rules select the same content; wind pauses while a keepsake preview is open and resumes on dismissal. The no-JavaScript original scene remains inside the reserved header.

Wind is a complete alternate visit rather than a cropped actor over the daily desk. Its window should have a visible fixed right jamb and an outward pane projected inside the opening; simplify the right curtain instead of hiding the pane's attachment. The original moving left cloth and reaching hand remain intact.

Workshop runs its authored performance once on first visible arrival, then rests. Project selection or a bear tap can replay it; overlapping input cannot stack performances. Reduced-motion and hidden/offscreen behavior remain explicit.

The integrated garden must keep the original tree, bench, mailbox and seated reading/greeting as one fixed scene. A small persistent plant belongs on the ground; watering is a temporary close-book, stand, care, return-to-reading activity. Shared storage remains preview-only until production integration is approved. Merely replacing the original footer artwork or crossfading two complete backgrounds does not meet this revision's contract.

## Bear stories production rollout (September 16)

The approved wind visit is enabled on the homepage at10%, with90% keeping the original daily desk. A30minute visit retains its choice. The same integrated reading footer now shares real watering state through the existing blog API and primary Supabase project; preview SQLite remains isolated. Travel suitcase and workshop reuse their reviewed art on dedicated public routes, reached from Photos and Playbook. Existing layout, subscription, darkroom and living-cover behavior remain. Wind endings keep quiet authored idle movement. No additional video generation in this rollout.
