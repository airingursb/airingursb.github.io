import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';

const posts = await getCollection('posts', ({ data }) => !data.draft);
const notes = await getCollection('notes', ({ data }) => data.public && !data.draft);

// Load fonts from local files
const notoSansSCBold = fs.readFileSync('src/assets/fonts/NotoSansSC-Bold.ttf');
const notoSansSCRegular = fs.readFileSync('src/assets/fonts/NotoSansSC-Regular.ttf');
const jetBrainsMono = fs.readFileSync('src/assets/fonts/JetBrainsMono-Medium.ttf');

// Load avatar
const avatarData = await fetch('https://avatars.githubusercontent.com/u/10513408?v=4&s=80')
  .then((res) => res.arrayBuffer());
const avatarBase64 = `data:image/jpeg;base64,${Buffer.from(avatarData).toString('base64')}`;

function extractExcerpt(id: string): string {
  const raw = fs.readFileSync(`src/content/posts/${id}.md`, 'utf-8');
  const body = raw.replace(/^---[\s\S]*?---/, '').trim();
  const lines = body
    .split('\n')
    .map((l) => l.replace(/^#+\s+/, '').replace(/!?\[.*?\]\(.*?\)/g, '').replace(/[*_`~>#-]/g, '').trim())
    .filter((l) => l.length > 0);
  return lines.slice(0, 3).join('');
}

export const getStaticPaths: GetStaticPaths = async () => {
  const postRoutes = posts.map((post) => ({
    params: { route: `${post.id}.png` },
    props: {
      title: post.data.title,
      description: post.data.description || extractExcerpt(post.id),
      tags: post.data.tags,
      date: post.data.date,
    },
  }));

  const noteRoutes = notes.map((note) => ({
    params: { route: `notes/${note.id}.png` },
    props: {
      title: note.data.title,
      description: note.data.summary || '',
      tags: note.data.tags,
      date: new Date(note.data.date),
    },
  }));

  return [...postRoutes, ...noteRoutes];
};

export const GET: APIRoute = async ({ props }) => {
  const { title, description, tags, date } = props as { title: string; description: string; tags: string[]; date: Date };
  const dateStr = date.toISOString().split('T')[0];

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0d1117',
          fontFamily: 'Noto Sans SC',
        },
        children: [
          // Main card area
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                margin: '32px 32px 0 32px',
                padding: '40px 48px',
                backgroundColor: '#161b22',
                borderRadius: '12px 12px 0 0',
                overflow: 'hidden',
              },
              children: [
                // Terminal header: ~$ ursb.me |
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '32px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '22px',
                    },
                    children: [
                      {
                        type: 'span',
                        props: {
                          style: { color: '#7ee787' },
                          children: '~$',
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: { color: '#e6edf3', marginLeft: '10px', fontWeight: 500 },
                          children: 'ursb.me',
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: {
                            width: '10px',
                            height: '24px',
                            backgroundColor: '#58a6ff',
                            marginLeft: '8px',
                            borderRadius: '2px',
                          },
                          children: '',
                        },
                      },
                    ],
                  },
                },
                // Title with left green border
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'row',
                      flexGrow: 1,
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: '4px',
                            backgroundColor: '#7ee787',
                            borderRadius: '2px',
                            flexShrink: 0,
                            marginRight: '24px',
                          },
                          children: '',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            flexGrow: 1,
                          },
                          children: [
                            {
                              type: 'div',
                              props: {
                                style: {
                                  fontSize: '48px',
                                  fontWeight: 700,
                                  color: '#e6edf3',
                                  lineHeight: 1.3,
                                },
                                children: title,
                              },
                            },
                            ...(description
                              ? [
                                  {
                                    type: 'div',
                                    props: {
                                      style: {
                                        fontSize: '22px',
                                        color: '#8b949e',
                                        marginTop: '20px',
                                        lineHeight: 1.6,
                                      },
                                      children:
                                        description.length > 150
                                          ? description.slice(0, 150) + '...'
                                          : description,
                                    },
                                  },
                                ]
                              : []),
                            // Spacer to push tags to bottom
                            {
                              type: 'div',
                              props: { style: { flexGrow: 1 }, children: '' },
                            },
                            // Tags + date row at bottom
                            {
                              type: 'div',
                              props: {
                                style: {
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                },
                                children: [
                                  // Tags
                                  {
                                    type: 'div',
                                    props: {
                                      style: {
                                        display: 'flex',
                                        flexWrap: 'wrap' as const,
                                        gap: '8px',
                                      },
                                      children: tags.map((tag: string) => ({
                                        type: 'span',
                                        props: {
                                          style: {
                                            fontSize: '16px',
                                            color: '#7ee787',
                                            border: '1px solid #238636',
                                            borderRadius: '16px',
                                            padding: '4px 14px',
                                            fontFamily: 'JetBrains Mono',
                                          },
                                          children: `#${tag}`,
                                        },
                                      })),
                                    },
                                  },
                                  // Date
                                  {
                                    type: 'span',
                                    props: {
                                      style: {
                                        fontSize: '18px',
                                        color: '#484f58',
                                        fontFamily: 'JetBrains Mono',
                                      },
                                      children: dateStr,
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          // Bottom bar
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '0 32px 32px 32px',
                padding: '16px 48px',
                backgroundColor: '#161b22',
                borderTop: '1px solid #21262d',
                borderRadius: '0 0 12px 12px',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: {
                      fontFamily: 'JetBrains Mono',
                      fontSize: '18px',
                      color: '#484f58',
                    },
                    children: 'ursb.me',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                    },
                    children: [
                      {
                        type: 'img',
                        props: {
                          src: avatarBase64,
                          width: 36,
                          height: 36,
                          style: { borderRadius: '50%', marginRight: '12px' },
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: {
                            fontFamily: 'JetBrains Mono',
                            fontSize: '18px',
                            color: '#e6edf3',
                            fontWeight: 500,
                          },
                          children: 'Airing',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Noto Sans SC', data: notoSansSCBold, weight: 700, style: 'normal' },
        { name: 'Noto Sans SC', data: notoSansSCRegular, weight: 400, style: 'normal' },
        { name: 'JetBrains Mono', data: jetBrainsMono, weight: 500, style: 'normal' },
      ],
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  const png = resvg.render().asPng();

  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
};
