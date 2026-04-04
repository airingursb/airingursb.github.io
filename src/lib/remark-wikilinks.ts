import { visit } from 'unist-util-visit';
import type { Text, Link } from 'mdast';

export const outgoingLinks: Map<string, string[]> = new Map();

const remarkWikilinks = () => {
  return (tree: any, file: any) => {
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

        parts.push({
          type: 'link',
          url: `/notes/${slug}`,
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
