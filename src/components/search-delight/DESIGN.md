# Search index bear

## Purpose and reference
The existing CN/EN Pagefind pages remain the search surface. A 96px brown pixel
bear with a sage index-card box sits at the right of the existing search heading,
immediately above the input. On mobile it is 72px wide. It never changes result
layout, search timing, focus, tab order or results. Existing heading typography,
20/48px gutters and neutral theme tokens remain authoritative.

Reference: public/bear-study/poster.png. Palette stays warm brown, cream, coral
cheeks, sage box and dark brown outline. H3 provides riffling / finding a card /
checking the box and scratching its head. No new frame, label, control, speech,
audio, confetti or shadow is introduced. Uniform magenta generation background
is removed offline; all frames are checked on light and #0d1117 backgrounds.

## Interaction
Consulted beui.dev action-swap source (2026-09-24): real state changes determine
feedback and reduced motion bypasses transitions. Here the state slot is a fixed
96px sprite; the character's authored performance is a novel application. The
Pagefind input is not intercepted and results are never delayed for animation.
A settled query (600ms, or Enter after IME composition ends) starts one search
performance; changing a query invalidates stale result feedback without playing
on every keystroke. Actual Pagefind loading/result DOM determines success or
empty reactions; no match count is inferred from the submitted term. Clearing
the input restores rest. Media failure, hidden/offscreen page and reduced motion
use the complete still. Animated actions finish in rest, with no infinite replay.

## Accessibility and cost
This actor is decorative and aria-hidden; Pagefind owns native input semantics,
result links and live announcements. Keyboard/touch/IME work identically.
There is no additional keyboard stop. Fixed space prevents layout shifts.
One local poster loads initially; small transparent atlases decode on first
settled search. No new runtime dependency or React island is introduced.

## Acceptance
CN and EN real successful / zero-result searches, rapid replacement, clear,
composition, Enter, media failure, reduced motion, offscreen pause and dark/light
edges must be verified. Personas: rapid keyboard searcher, mobile reader,
Chinese IME user, reduced-motion reader. No accepted functional/accessibility
debt. Root integration owns the production build and browser acceptance.
