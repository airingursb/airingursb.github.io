# Shared homepage horizontal strips

Existing homepage system: dark #0d1117 background, #161b22 surfaces, #e6edf3 text; light mode #ffffff/#f6f8fa/#1f2328. All component colors inherit --c-* and --accent theme variables. Preserve existing mono typography, card borders, spacing and native horizontal strip layout.

## Scrollbar primitive
Apply one shared rule to .reading-home-strip, .comics-strip (also diorama shelf), .photos-strip and .workouts-strip. Native scrolling, keyboard interaction, snap and touch gestures remain unchanged. No JavaScript or replacement scrollbar.

Tokens: --strip-scrollbar-size 6px; --strip-scrollbar-thumb rgba(var(--c-overlay-rgb), .28), --strip-scrollbar-thumb-active rgba(var(--c-overlay-rgb), .44). Transparent track and corner; rounded thumb radius equal to scrollbar size. Standard scrollbar-color/width and WebKit fallback both specified. Hover/focus-within strengthens thumb contrast; forced-colors restores automatic system coloring. Never hide the scrollbar or reserve a white track. Layout and typography of strip content remain unchanged.

## Verification scope
Homepage reading, comics, diorama, photos and workouts, in dark/light modes at phone and desktop widths. Scroll to later items, confirm native interaction and absence of page overflow. Keep browser's forced-color accessibility behavior. Screenshot supplied is a defect report, not a pixel target.

## Homepage language toggle

Preserve the fixed top-right EN/CN control and existing language persistence. Use the homepage mono font at 12px, neutral `--c-bg-alt` surface, `--c-border` outline and `--c-text-muted` labels. No shadow or backdrop blur. The selected segment uses `--c-text`, weight 600 and an 8% `--accent-rgb` tint; hover uses a 4% overlay. Outer radius 8px, inner radius 4px, inset/gap 4px; each segment is at least 36px square with 8px horizontal padding, increasing to 44px for coarse pointers. Retain the 16px viewport inset, respecting safe-area insets. Focus uses a 2px inset accent outline, visible within the segment. Keep existing 200ms color transitions; reduced motion disables them. Verify both languages, theme changes, persistence, hover and keyboard focus at 375/768/1280px. This is a local control refinement; other homepage design and existing accessibility/performance debt remain outside its scope.

## Bear home and garden (approved art, September 2026)

Reference: `output/bear-home-study/design-v5/` window day/rain/night, footer day/night, and props letter/photo/book. User approved the art and implementation, with explicit instruction to reduce the footer's visual size. Keep the existing desk bear identity and all its animation atlases; generated window study bear is only a composition reference. Extract independent environment assets. No collectibles, action captions, playback toolbar or immediate prop navigation.

Palette: outline `--bear-outline: #48382d`, sage `--bear-sage: #91ac89`, cream `--bear-cream: #f4e2b9`, wood `--bear-wood: #cba574`, warmth `--bear-warmth: #f6d58c`, rain `--bear-rain: #88a6b2`, camera `--bear-camera: #55565c`. Page UI inherits existing `--c-*`, `--accent`, mono typography. Paper prose uses Songti SC/STSong/Georgia serif; real photos retain photographic detail inside pixel frames. Paper text 14px / 1.8–1.9, book quote16–18px, title24–28px, metadata12px. Pixel edge step4px; spacing4/8/12/16/20/24/32/40px.

### 5. Primitives and states

- Window: approximately70–80px wide behind the232px desk (200px mobile). Fixed scene coordinates, neutral/closed/open and daylight/rain/night states. Weather is confined to the glass. Existing bear foreground remains above it, ears and maximum motion extent remain visible. Expired weather uses neutral sky. Indoor rainy routine reads/drinks instead of opening an umbrella.
- Content preview: one native top-layer, light-dismiss panel at a time, up to416px wide and viewport minus32px on mobile; bounded height with internal scrolling. First activation reveals real content, optional explicit content link continues. Cream letter in sage envelope, cream photo print, two-page book. Read current source data, preserve actual dates and omit missing data. No label-to-second-click interaction. Escape/outside closes; keyboard focus restored without page jumps. Links remain useful with JS disabled.
- Garden footer: copy and a compact tree/bench/mailbox/bear scene beside it. Scene target340×220px desktop, max300×200px mobile; copy stacks above scene on mobile. No screen-height illustration or full-resolution asset in initial payload. Existing subscription/name/email/error/success behavior and legal/status links remain accessible. Subscription lives in native details; mailbox opens details and focuses email, never sends. Reading bear is independently animated: idle blink/page turn, direct bear press greets then resumes reading. Book opens the same book preview primitive. No sound.

### Motion, performance, and accessibility

Popover mechanics reference: `https://beui.dev/r/popover/raw`, read September13. Adapt spatial continuity, interruptible activation, native top-layer light dismiss and focus return; do not import React/Motion or goo effects. Paper reveal240ms transform+opacity, close160ms, ease cubic-bezier(.2,.8,.2,1); window open320ms, environment tint240ms. Pixel body motion uses generated frame atlases at10–12fps. No new framework dependency. Reduced motion shows stills and immediate panel/window state changes with no autoplay; meaningful interaction remains available. Pause animation offscreen or hidden tab; footer animation loads only near viewport. Static footer target<=150KB, animation target<=500KB, report actual payload. Hit targets>=44px without visible chrome, focus2px accent ring. Never autoplay audio or auto-submit any form.

Personas: phone visitor on mobile data, returning desktop reader, keyboard/reduced-motion visitor. Each can inspect content without losing place; first-click interactions remain immediate. QA uses real production preview at375/768/1280, light/dark, open/close, repeat taps, Escape/focus, reduce motion, viewport pause and loading failure. Existing unrelated homepage performance/accessibility issues are baseline, not permission to remove content.

### Content preview refinement V7

User requests more polish than the approved first implementation. Supersedes V6 preview geometry/paper treatment: retain object identities as restrained stationery, with small pixel accents rather than large stair-step outlines. Existing site typography/chrome and all bear assets remain unchanged.

Shared paper tokens: paper #faf8f1, ink #3d443e, muted #68705f, rule #d9dccf, sage #a1af94, cover #819078; night paper #e8e8dc, ink #343c36, muted #596350, rule #bdc4b4. Fine1px outlines,2px paper corners, soft olive-tinted shadow, subtle page-edge layering. Serif Songti SC/STSong/Georgia for readable content, system sans-serif for labels; titles22px, prose15px/1.9, book quote20px/1.85, metadata11–12px. Spacing8/12/16/24/32px. No new font download.

Letter: up to432px, spacious single paper, small sage envelope underlayer, date row and quiet signature/footer. Letter signature is plain12px/1.9 system sans-serif, muted ink with .04em tracking, optically aligned with the reading link; no italic logo or seal beside the name. Nothing overlaps readable text or links. Photo: up to448px, authentic photo within a clean print border, full image retained with contain sizing, small camera detail in caption. Book: up to528px, narrow metadata page and generous quote page, subtle spine/stacked edges/bookmark; <=480px uses one continuous reading page with metadata above quote, removing cramped two-column CJK wrapping. All widths remain viewport minus32px, internal overflow only for short screens.

Opening retains240ms spatial opacity/transform transition. Letter sheet settles upward4px and book right page unfolds from a3-degree angle, triggered only on open, without looping ornament. Close160ms; reduce-motion disables all added transitions. Quiet44px close controls and visible keyboard focus, native light dismissal/focus return remain. Preserve historic dates, lazy real-photo load and the existing explicit destination links. QA includes all three objects, footer book, keyboard/repeated/outside dismissal and320px short-screen/reduced-motion checks.
