# A note added later — acceptance preview

## Scope and plan

This is an isolated UI/interaction preview for idea 5. It does not modify a post,
create an author's addendum, persist a reading event, or publish new content.
CN/EN previews reuse the existing SiteHeader, BaseLayout and theme system.

1. [completed] Read the existing design system and article source; define the contract.
2. [completed] Build the shared paper-tab primitive and contextual preview.
3. [completed] Verify disclosure, keyboard, reduced motion and responsive screenshots.

## Direction

A later date is a small paper tab tucked beside the original article's metadata.
It opens into a slim sheet before the original prose, like a new page inserted
into an old book. The old publication date remains visible and unchanged. The
closed state is compact; there is no notification, badge count, modal or mascot.
Use one direction with complete states, not three unrelated mockups.

## References and research

Existing-project branch: root DESIGN.md, SiteHeader, editorial previews, and the
real tools post (2024-03-29) are the visual/content contract. No new framework,
React hydration, font, illustration or tooling dependency is needed.
beui.dev /r/bouncy-accordion/raw consulted 2026-09-23: retain a connected
trigger/content disclosure, direction-specific enter/exit and immediate reduced
motion; adapt to native details + interruptible WAAPI, no vendor code.

## Content truth

Title and the first two paragraphs are verbatim excerpts from the CN/EN tools
post. The example note explicitly describes itself as fictional in its heading
and body. Never assign the fictional note an Airing signature or attribute
invented changed opinions to the real author. The original-article link is real.
Review instructions and design rationale stay in a separate noindex preview
strip and a collapsed explanation after the article, outside the product UI.

## Tokens

Inherit --c-bg, --c-text, --c-text-muted, --c-border, --accent and --font-mono.
Body/display: ui-serif, Songti SC, STSong, Georgia, serif. UI: existing sans stack.
Type: 40px desktop / 28px mobile title; 18px body, 18px note heading; 14px actions;
12px metadata. 4px spacing grid; 720px article measure, 48px desktop / 20px mobile
gutters; 32px after title, 24px note padding (20px mobile), 44px hit areas.
New local paper tokens: --later-paper #f8f6ef / #1b211d;
--later-paper-edge #d9ddcf / #465148; --later-fold #e7ebde / #303b33;
--later-muted #656d76 / #9ba69d (4.85:1 light / 6.50:1 dark on paper).
Paper uses a 1px rule and a single folded 12px corner. No floating-card shadow.
--later-reveal 240ms; --later-fold-back 180ms; existing editorial easing
cubic-bezier(.2,.8,.2,1). Only transform/opacity animate; layout changes once.

## Primitive and states

LaterNote: semantic details + summary, original/later date, paper content,
keyboard-accessible return button. Closed: date and folded paper tab only.
Open: connected paper below, changed summary affordance, readable note.
Closing: paper folds toward its tab, then original prose returns.
Rapid activation cancels/reverses the in-flight animation; no queued actions.
Escape closes only when focus is inside this disclosure and restores its tab.
Return button restores focus to the tab without changing the page URL.
Native disclosure remains functional without JavaScript; enhanced-only return
control is absent without JS. There are no backend calls or fake counters.

## Responsive and accessibility

Desktop: original date left, tab right, both share the title's reading column.
Mobile: original date stays above the same right-aligned tab; a long EN tab wraps
without clipping. Note stays in flow and full reading width, not a bottom sheet.
Shared site language and theme controls work on the dedicated CN/EN paths.
Use real headings, native details semantics, 44px targets and 2px accent focus.
Hover keeps the readable text color and strengthens the underline rather than
using the site's low-contrast light green for small text on paper.
Reduced motion skips both animations and retains all actions. No autoplay,
automatic expansion, focus theft, artificial notification or full-page theme.
Personas: first-time CN reader, returning EN reader, mobile touch reader,
keyboard/reduced-motion reader. All should distinguish original prose from demo
addendum and continue reading without losing context.

## Verification and accepted scope

Capture closed/open at 375/768/1280 in light/dark, CN/EN; exercise Enter, Space,
Escape, return, rapid open-close-open, no-JS and reduced motion. Parent agent
owns full build/global visual review. CMS schema, real addenda, inline paragraph
anchors and publishing are intentionally out of scope until UI approval.

## September 24 publication

Approved UI promoted to `editorial/LaterNote.astro`, shared by the demo and the
real PostLayout. Optional validated `laterNote` frontmatter supplies date, title
and plain-text paragraphs. Absent content renders nothing. The existing date/tab
geometry and tokens apply within the reading column. The preview retains its
fictional-content labels; no authored addendum is invented for existing posts.
