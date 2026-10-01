# Echo · Correspondence journal

## Issue 02 · Release (2026-10-02)

The author has requested release of the reviewed bilingual second issue, including the exercise typography fix. The production build includes both issues and eight anonymized exchanges, the existing issue-02 bear artwork, translated covers, homepage/archive entries and sharing. Keep local component showcase routes and private research outside the release. The `ECHO_EDITORIAL_PREVIEW` flag is unset in production so public pages remain indexable.

The earlier private-preview notes below describe the preparation history. Publication proceeds on 2026-10-02, after the normal >180-day boundary, under the author's existing release instruction. No early exception is used.

## Issue 02 · Editorial rewrite (2026-10-01)

The author approved the new thesis: “选工作时，别只算这一次” / “Choosing a job? Think one move ahead.” This supersedes the September 30 chronology-led content structure below. Four arguments examine experience for the next job search, evidence for growth and internal transfers, the exchange of time for pay and learning, and the timing of a departure. Each develops the dilemma, reasons, conditions and a useful next question in the author's first person. New editorial analysis is distinguished from unchanged, dated correspondence; no later outcome is invented.

- Move the condensed correspondence dates into `CorrespondenceIndex`, next to the complete original letters. The opening leads directly to the essay. Do not repeat the argument as a second timeline before the essay.
- Hero and section quotations retain exact source wording in both languages. `relatedSources` links other letters used by a section. Keep existing chapter anchors for saved links.
- Preserve the slate/river opening, existing bear, paper and type roles. Refresh both share-cover PNGs from `EchoCover` after changing the title and teasers; optimize PNGs without changing decoded pixels. The homepage, archive, issue and share surfaces must use the same title.
- Verify Chinese font coverage for the new body, headings and handwritten quotes. All original letter bodies, aliases, redactions and dates remain unchanged. This is a private preview; no publication is part of this edit.

## Editorial voice (2026-10-01)

Airing is the narrator of both editions. Use first person for authored introductions, connecting prose and reflections in Chinese and English. Do not describe his reasoning as an outside commentator. Preserve original correspondence, exact quotations, sender/recipient fields, signatures and attribution labels.

## Issue 02 · A correspondence dossier (2026-09-30)

Shared principles, individual issues: the author explicitly wants different visual identities rather than identical templates. Keep reader dilemmas prominent, distinguish editorial interpretation from exact replies, and make every quotation traceable to a dated original. Issue 01 remains the warm learning edition. Issue 02 uses the existing slate-blue cover ink and river/boats illustration to explore decisions made under changing circumstances.

- `CareerOpening`: a full-width headline and quiet editorial premise precede an illustrated spread. The illustration and a handwritten reply share the lower spread, with a small correspondence date line. No new bear, animation, or fabricated outcomes. The title uses 48px / 1.35 (34px on narrow screens), metadata uses existing 12/14px roles, and quote uses 28px / 1.65 (24px narrow). Reuse 16/24/32/48px gaps. New tokens: `--career-ink: #395863`, `--career-title: 48px`, `--career-quote: 28px`, `--career-date-width: 136px`. These belong only to issue 02, not the shared site header.
- `CorrespondenceTrail`: a chronological editorial ledger, not three identical cards. Each row pairs original incoming/reply dates with the changed circumstance and the resulting question; all copy is explicitly editorial, with links to original replies. First three rows follow Xingzhou; Zhiqiu's fourth exchange is clearly a separate reader and situation. Desktop date gutter is 136px, content flexible; below 900px the circumstance/advice comparison and opening headline/premise stack for readable lines, below 720px the date gutter also stacks. Header summarizes the through-line without pretending an outcome is known.
- Spatial reference: [StyleGallery sidebar](https://github.com/changeroa/StyleGallery/blob/main/patterns/split-sidebar/sidebar.md), used only for date-gutter/content wrap and readable source order. Document owns all scrolling; no inner scroll or fixed-height content.
- Reuse `Passage`, `PullQuote`, complete letter sheets, aliases, dates, shared header/footer, dialogs, analytics and language switching. Both locales receive the same editorial structure. The opening quote retains its exact original wording. Changes to claims or anonymized originals are out of scope.
- Publication boundary: this worktree is a private author preview with `ECHO_EDITORIAL_PREVIEW=true` and noindex metadata. Do not push its second-issue sources or assets to the public repository before 2026-10-02. No scheduled publication is implied. Review URLs use canonical /echo/ paths on a private preview port.
- Accessibility/personas: a mobile reader can compare changing conditions without a horizontal table; a keyboard reader can open any reply and return to the issue; English readers see translated quotes labeled as such; no new motion or JavaScript. Long headings must preserve Chinese phrases and English words. Date labels remain explicit and dates machine-readable.
- Validation: new primitives first in an isolated component route at 375/768/1280; then bilingual archive, both issue pages, eight exchange pages, sharing and homepage. Accepted preview limits: noindex and HTTP are intentional; do not remove privacy protections to raise synthetic SEO scores. No new accessibility debt is accepted.

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
