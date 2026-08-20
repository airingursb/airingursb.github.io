// Assigns a stable, language-independent anchor id (`data-aid`) to every
// top-level block element of a rendered post body.
//
// Why: inline ("划线") comments anchor to a passage of text. The zh and en
// versions of a post share one comment pool (same slug), but their text
// differs, so a highlight anchored by raw text can never be re-located in the
// other language. `data-aid` gives each block a key derived purely from
// document *structure* — never from text — so block N in the Chinese version
// maps to block N in the English version as long as the two translations share
// the same heading/block skeleton (they are parallel translations).
//
// Scheme (localizes drift so a divergence in one section doesn't cascade):
//   - every heading (h1–h6) bumps a section counter and resets the block index,
//     and is itself tagged `h<section>` (headings are anchorable too);
//   - every other top-level block is tagged `s<section>b<index>`.
//
// Consumed by the inline-comment logic in src/layouts/PostLayout.astro.

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export function rehypeAnchorIds() {
  return (tree) => {
    if (!tree || !Array.isArray(tree.children)) return;
    let section = 0; // bumps on every heading — a stable cross-language landmark
    let block = 0; // block ordinal within the current section
    for (const node of tree.children) {
      if (node.type !== 'element') continue;
      node.properties = node.properties || {};
      // Don't clobber an id an author (or another plugin) set explicitly.
      if (node.properties.dataAid != null) continue;
      if (HEADINGS.has(node.tagName)) {
        section += 1;
        block = 0;
        node.properties.dataAid = 'h' + section;
      } else {
        node.properties.dataAid = 's' + section + 'b' + block;
        block += 1;
      }
    }
  };
}

export default rehypeAnchorIds;
