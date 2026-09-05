# Airing's Blog Design System

This contract currently covers the editorial surfaces under `/reading/`. Other long-lived sections retain their existing local systems until they are deliberately extracted.

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
- Page gutters remain symmetric. On weekly pages the theme switch occupies reserved masthead space rather than floating over editorial content.
- Breakpoints follow the existing Reading surfaces: mobile at 720px, tablet at 1020px, wide layout above 1020px.

## 5. Components

### Reading masthead

- **Structure:** top rule, brand/navigation row, breadcrumb/language row.
- **States:** current section, hover, keyboard focus.
- **Accessibility:** landmark navigation, `aria-current`, visible focus.
- **Motion:** color changes only, 150ms.
- **Layout:** centered shell; non-current links collapse on mobile.

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
