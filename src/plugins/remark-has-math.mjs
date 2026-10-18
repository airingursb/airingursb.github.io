// Flags documents that contain TeX math (after remark-math has parsed `$…$`
// and `$$…$$`), so layouts load the KaTeX stylesheet only where it is needed.
// Read back as `remarkPluginFrontmatter.hasMath` from `render(entry)`.
import { visit, EXIT } from 'unist-util-visit';

export function remarkHasMath() {
  return (tree, file) => {
    let found = false;
    visit(tree, (node) => {
      if (node.type === 'math' || node.type === 'inlineMath') {
        found = true;
        return EXIT;
      }
    });
    if (!found) return;
    const astro = (file.data.astro ||= {});
    (astro.frontmatter ||= {}).hasMath = true;
  };
}

export default remarkHasMath;
