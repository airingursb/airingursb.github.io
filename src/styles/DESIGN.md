# Shared homepage horizontal strips

Existing homepage system: dark #0d1117 background, #161b22 surfaces, #e6edf3 text; light mode #ffffff/#f6f8fa/#1f2328. All component colors inherit --c-* and --accent theme variables. Preserve existing mono typography, card borders, spacing and native horizontal strip layout.

## Scrollbar primitive
Apply one shared rule to .reading-home-strip, .comics-strip (also diorama shelf), .photos-strip and .workouts-strip. Native scrolling, keyboard interaction, snap and touch gestures remain unchanged. No JavaScript or replacement scrollbar.

Tokens: --strip-scrollbar-size 6px; --strip-scrollbar-thumb rgba(var(--c-overlay-rgb), .28), --strip-scrollbar-thumb-active rgba(var(--c-overlay-rgb), .44). Transparent track and corner; rounded thumb radius equal to scrollbar size. Standard scrollbar-color/width and WebKit fallback both specified. Hover/focus-within strengthens thumb contrast; forced-colors restores automatic system coloring. Never hide the scrollbar or reserve a white track. Layout and typography of strip content remain unchanged.

## Verification scope
Homepage reading, comics, diorama, photos and workouts, in dark/light modes at phone and desktop widths. Scroll to later items, confirm native interaction and absence of page overflow. Keep browser's forced-color accessibility behavior. Screenshot supplied is a defect report, not a pixel target.
