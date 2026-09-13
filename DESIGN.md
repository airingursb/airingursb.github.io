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
