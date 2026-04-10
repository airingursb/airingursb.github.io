import { visit } from 'unist-util-visit';
import type { Text, Link } from 'mdast';

export const outgoingLinks: Map<string, string[]> = new Map();

interface WikilinkOptions {
  /** Set of EN note slug IDs (for cross-language fallback) */
  enNoteSlugs?: Set<string>;
}

const remarkWikilinks = (options: WikilinkOptions = {}) => {
  const enNoteSlugs = options.enNoteSlugs ?? new Set<string>();

  return (tree: any, file: any) => {
    // Detect if current file is an EN note (under src/content/notes/en/)
    const filePath = (file.path || file.history?.[0] || '') as string;
    const normalizedPath = filePath.replace(/\\/g, '/');
    const isEnNote = normalizedPath.includes('/content/notes/en/');

    const sourceSlug = file.data.astro?.frontmatter?.title as string | undefined;
    const links: string[] = [];

    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
      const parts: (Text | Link)[] = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(node.value)) !== null) {
        const [full, target, displayText] = match;
        const beforeText = node.value.slice(lastIndex, match.index);

        if (beforeText) {
          parts.push({ type: 'text', value: beforeText });
        }

        const slug = target
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '');

        links.push(target);

        // Determine link URL based on source file language and target availability:
        // - zh note → always /notes/${slug}
        // - EN note + target exists in EN → /en/notes/${slug}
        // - EN note + target NOT in EN → fallback to /notes/${slug}
        let url: string;
        if (isEnNote) {
          url = enNoteSlugs.has(slug) ? `/en/notes/${slug}` : `/notes/${slug}`;
        } else {
          url = `/notes/${slug}`;
        }

        parts.push({
          type: 'link',
          url,
          children: [{ type: 'text', value: displayText || target }],
          data: {
            hProperties: { class: 'wikilink' },
          },
        } as Link);

        lastIndex = match.index + full.length;
      }

      if (parts.length === 0) return;

      const remainingText = node.value.slice(lastIndex);
      if (remainingText) {
        parts.push({ type: 'text', value: remainingText });
      }

      (parent as any).children.splice(index, 1, ...parts);
    });

    if (sourceSlug && links.length > 0) {
      outgoingLinks.set(sourceSlug, links);
    }
  };
};

export default remarkWikilinks;
