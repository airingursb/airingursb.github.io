# Echo · Correspondence journal

The author approved the V6.4 design and explicitly requested production release on 2026-09-27. This document describes the production system; prototype history and private research remain outside the release.

## Production integration · 2026-09-27

Preserve the approved V6.4 composition, 3:4 covers, existing watercolor bear, paper/ink type system and aligned issue rows. The supplied homepage screenshot locates the new entry, rather than requesting an exact clone of a new card.

- Canonical routes: /echo/ and /en/echo/, with /issues/:number/ and /letters/:id/ beneath each. Shared blog navigation gains Echo; no promotional blocks inside the blog article list.
- Homepage: a separate card between letter consultation and guestbook. Use existing homepage `--c-*`, `--font-mono`, radius and card padding. One understated heading, short introduction, one real cover thumbnail at launch, with a grid for future issues with linked topic headlines, and one all-issues link. No new animation. At <=760px stack issue entries, maintaining image ratio and a readable text column.
- Card text: 14px metadata heading, 24px introductory title, 18px issue titles (17px on narrow phones), 12px labels; use 8/12/16/24px spacing and existing homepage accent for directional arrows and keyboard focus. Cover artwork retains its own paper colors. Thumbnail PNGs are actual downloadable covers; surrounding copy, links and state remain live DOM.
- Languages: card switches with the homepage's existing html lang state. Link language follows visible copy. Production journal copy removes author-preview labels; originals remain explicitly anonymized, English explicitly translated.
- Accessibility: native anchors/buttons, 44px targets, visible focus, no motion required for homepage entry; keyboard and narrow-screen readers can reach issue and archive links. No private content in analytics.
- Accepted scope: unchanged surrounding homepage modules may have existing performance/accessibility debt. New entry ships no runtime framework or video and uses lazy responsive cover thumbnails. Journal H3 retains reduced-motion behavior.

## Existing journal tokens and anatomy

The retained `styles/editorial-tokens.css` and `styles/tokens.css` define the white exterior, warm paper, pine text, blue handwritten quotations, 4px spacing scale, serif and handwritten roles. `journal.css` owns the 1200px shell and responsive cover/heading/body/footer grid. `letters.css` owns the envelope, ruled sheet, date, signature and correspondence navigation. Share, post-office and long-form modules retain their approved local tokens. Compact Chinese topic labels retain authored phrase boundaries; share titles wrap at punctuation so words and sentence endings stay together on phones.

User journeys: homepage or blog navigation → journal → issue theme → complete correspondence; language switch retains current letter and anchor; share opens a native dialog, copies or downloads a real cover, and Escape returns focus. A visitor can instead use the visible Gmail link for a free letter.

Publication scope follows the author’s editorial decision. Content is anonymized before entering this module, with stable aliases and original dates. Analytics records stable issue/letter/chapter identifiers and interaction categories, never body text, aliases, email addresses or selected text.

Launch scope: issue 01 only. Issue 02 ends on 2026-04-04 and does not pass the author’s >180-day rule until 2026-10-02. Its full source, English translations and cover downloads are excluded from the public release, not merely hidden by client code. The complete two-issue author preview remains local.
