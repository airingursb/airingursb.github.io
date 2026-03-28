import { visit } from 'unist-util-visit';

const EMBED_PATTERNS = [
  {
    name: 'youtube',
    regex: /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
    template: (id) => `<div class="embed-container"><iframe src="https://www.youtube.com/embed/${id}" width="100%" height="400" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:8px"></iframe></div>`
  },
  {
    name: 'bilibili',
    regex: /^https?:\/\/(?:www\.)?bilibili\.com\/video\/(BV[\w]+)/,
    template: (id) => `<div class="embed-container"><iframe src="//player.bilibili.com/player.html?bvid=${id}&high_quality=1" width="100%" height="400" frameborder="0" allowfullscreen style="border-radius:8px"></iframe></div>`
  },
  {
    name: 'apple-music',
    regex: /^https?:\/\/music\.apple\.com\/(.+)/,
    template: (path) => `<div class="embed-container"><iframe src="https://embed.music.apple.com/${path}" width="100%" height="175" frameborder="0" allow="autoplay *; encrypted-media *;" style="border-radius:8px;overflow:hidden"></iframe></div>`
  },
];

export function remarkEmbed() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (node.children.length !== 1) return;
      const child = node.children[0];
      // Handle both plain text URLs and link nodes
      const url = child.type === 'text' ? child.value.trim()
        : child.type === 'link' ? child.url
        : null;
      if (!url) return;
      for (const { regex, template } of EMBED_PATTERNS) {
        const match = url.match(regex);
        if (match) {
          parent.children[index] = { type: 'html', value: template(match[1]) };
          return;
        }
      }
    });
  };
}
