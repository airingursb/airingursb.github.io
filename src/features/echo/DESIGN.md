# Echo · Correspondence journal

## Theme continuity repair · 2026-10-03

Respect the site's saved `blog-mode` / `blog-mode-set` before first paint on every Chinese/English archive, issue and letter route. Default to light when no manual preference exists, matching the other blog routes. A persistent native 44px SVG theme button reuses those keys and records `echo-theme-toggle`; it never resets the theme during navigation. Keep all layout, H3, type roles and original share-cover colors intact.

Dark tokens: canvas/site background #0d1117, surface #161b22, journal paper #1b242b, leaf #1d272d, ink #e6edf3, muted #a7b2b6, rule #3b4850, pine #b2cfbd, pen #aecbea, selected #25332e, rest ink #e5bdab, rest paper #282422, rest rule #6b554a, highlight #3c422c, active highlight #515b34, paper edge #3b4850. Envelopes #252c2c, pencil #e1e7e4, stamp #2c3c34, envelope muted #b5bfba, crease #0002 / #ffffff08, stationery rule #aecbea24, margin #d0a69840, seal #d8b9ae. Career ink #b1cbd3. Each edition derives its night ink by mixing 78% shared ink with its original edition color; its wash becomes selected. Keep printed 3:4 covers light, including their green #3b5b49, blue #395863, rest #784a3e and paper #f7f4eb. Covers and share PNGs are artifacts; surrounding shelf, reading sheets and share dialog follow the UI theme.

Verification: all 66 canonical routes (12 issues + 20 letters + archive per language), stored dark/light first paint and cross-route persistence, live toggle/reload, headers, paper, handwriting, share dialog and reduced/normal bear playback at phone/tablet/desktop. Text contrast >=4.5:1. Analytics carries identifiers/categories only, never correspondence bodies, private aliases, email or selected text. The shared `site-analytics.js` preserves at most50 pending events for20minutes in sessionStorage across rapid Echo/Friends navigation; deferred delivery retains `originPath` when needed and consumes the queue once. Existing third-party performance debt remains outside this repair; no new dependencies or regenerated artwork.

## Issues 03–12 · Authorized release (2026-10-02)

The author explicitly requested publication of the reviewed current edition set after asking to remove the private-preview notice. Release all twelve bilingual issues, twenty anonymized exchanges, the shared archive/homepage navigation, and all twenty-four share covers. Issue 10 is included under this explicit author-approved exception to the usual 180-day interval; its retained `releaseAfter` value records the original standard eligibility date, not a production gate. Earlier private-preview instructions below are historical preparation notes superseded by this release decision.

Keep the local `.env.local`, research evidence, raw private source records and the Echo component-showcase routes outside the release. Production does not set `ECHO_EDITORIAL_PREVIEW`; canonical Echo pages remain indexable and use the public ursb.me URLs. Preserve the existing favicon and unrelated site work.

## Issue 03 · An afternoon left open (2026-10-02)

Approved theme: “休息，也需要一个理由吗？” / “Does rest need a reason?” Four first-person essays examine the cost of treating every hour as an investment. Three complete, anonymized exchanges belong to two readers; the first two remain one ongoing conversation. Historical replies stay dated, attributed and distinct from newly written commentary. Publication remains subject to the author's instruction; this worktree is a private, noindex preview.

- Keep the same watercolor bear and 3:4 cover anatomy. New illustration: a letter left on the desk while the bear looks through a post-office window at sunset. Theme typography remains larger than the journal name. No new animation: stillness is part of this edition's subject.
- Tokens local to edition 03: `--rest-ink: #784a3e`, `--rest-paper: #f5f1e8`, `--rest-rule: #cbb9a7`, `--rest-title: 52px` (42px tablet, 36px mobile), `--rest-quote: 28px` (24px mobile), `--rest-copy-measure: 34rem`. Preserve existing body/handwritten/source type roles and 8/16/24/32/48px spacing. Dark text on paper; no low-contrast apricot body text.
- `RestOpening` pairs a large question and small editorial premise with a window-shaped crop of the real illustration. A dated, linked handwritten quote completes the opening below it. Reading width follows [StyleGallery content-limiter](https://github.com/changeroa/StyleGallery/blob/main/patterns/containment/content-limiter.md): fluid outer composition, limited prose measure, document-owned scrolling.
- `OpenQuestion` closes with one reflection, not another exercise checklist. `CorrespondenceIndex` groups this issue's envelopes by stable reader alias and explicitly labels the continuing conversation. Same component used on both language surfaces; all dates and complete originals remain accessible.
- Validate primitives in a private showcase at 375/768/1280 before composing the issue. Cover/title long-text, grouped letters, keyboard focus, empty exercise vs reflection, and source jumps are required states. Below 720px, reading order stays title → picture → quote; no absolute-positioned prose or fixed content heights.
- Archive, homepage, cover, masthead and analytics must accommodate three exchanges. Lightweight public route identifiers may enter the client bundle; full correspondence data must not. Refresh both share covers from the actual cover component. PNG optimization is lossless and decoded-pixel equality is recorded; responsive WebP files are separate delivery derivatives.
- The homepage uses three columns on wide screens with 80px cover thumbnails, preserving enough width for complete Chinese words and sentence endings; narrower screens retain the existing two-column or stacked layout. English compact postmarks use the existing 10px byline role and centered text inside the seal.
- Verify the exact hero/section quotations against the anonymized replies, preserve paragraph order in English, extend Chinese font subsets, and check share/copy/download/write events once per action. No private names, contact details or body text in analytics.
- Accepted preview limits: private HTTP and noindex, plus existing unrelated homepage accessibility/performance debt. No new accessibility debt or dependencies are needed.

## Issues 04–12 · A growing correspondence shelf (2026-10-02)

The author asks for all nine editions in a private preview. Keep the established 3:4 cover, watercolor bear identity, large topic headline, restrained journal name, readable paper and dated original quotations. Each edition receives a distinct illustration and ink palette. Three opening compositions (field notes, desk spread, quiet horizon) vary the relationship of title, artwork and quotation while keeping the same reading order on narrow screens. No new motion is required.

- New tokens: `--edition-ink`, `--edition-wash`, `--edition-title: clamp(32px, 4.5vw, 54px)`. Ink colors stay dark on paper; focus remains the existing blue. Use the existing type roles and spacing scale. Hero text never overlays artwork. Opening layouts stack below 900px and titles have no fixed height.
- The archive features the newest edition, followed by a three-column cover shelf (two columns below 900px, one below 600px). The personal homepage shows only the latest three editions. A native details issue picker and adjacent links replace an ever-growing row of twelve links.
- A correspondence can appear in several themes but has one canonical transcript. Query context identifies the originating issue; links back and the next exchange preserve that context. Related-edition links remain visible without JavaScript. Counts use unique exchanges, never sum reused memberships.
- Manuscripts support reader follow-ups and author follow-ups. Unknown individual dates are shown as unknown, with the source-page date explicitly described as a record date. Never turn a page timestamp into a message timestamp. Every speaker retains a separate sheet.
- The author requested removal of the private-preview notice on 2026-10-02. Issue, transcript, shelf and component showcase render without that card in either language. Source-date metadata remains internal. Cover downloads use the same DOM cover, with lossless PNG optimization and pixel verification.
- Quote captions include the original reply date, including in issues 02 and 03. The issue-02 tablet spread gives the English quotation a full-width line measure. New content is first-person editorial interpretation, exact quotations are checked against retained source paragraphs, and translations preserve all correspondence turns.
- Required evidence: bilingual 375/768/1280 screenshots, no horizontal overflow, source and return navigation, follow-up roles, unknown dates, all cover downloads, copy/share/write analytics once per action, reduced-motion behavior of the existing bear, font glyph coverage, and unique source membership tests.

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
