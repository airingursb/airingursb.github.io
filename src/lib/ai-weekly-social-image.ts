import { readFile } from 'node:fs/promises';
import { createElement as h } from 'react';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { weeklyArticleCount, weeklyDateLabel, type AIWeeklyIssue, type WeeklyLocale } from '../data/ai-weekly';

const palette = { paper: '#f6f2e8', ink: '#252a27', muted: '#67675d', accent: '#a74432', rule: '#d7d1c3' };
const fontFiles = Promise.all([
  readFile('src/assets/fonts/NotoSansSC-Regular.ttf'),
  readFile('src/assets/fonts/NotoSansSC-Bold.ttf'),
  readFile('src/assets/fonts/JetBrainsMono-Medium.ttf'),
]);

export async function generateWeeklySocialImage(issue: AIWeeklyIssue, lang: WeeklyLocale): Promise<Buffer> {
  const zh = lang === 'zh';
  const [cover, [regular, bold, mono]] = await Promise.all([
    readFile(`public${issue.shareCover[lang]}`), fontFiles,
  ]);
  const tree = h('div', {
    style: { display: 'flex', width: 1200, height: 600, padding: 48, gap: 40, alignItems: 'center', background: palette.paper, color: palette.ink, fontFamily: 'Noto Sans SC' },
  },
  h('img', { src: `data:image/png;base64,${cover.toString('base64')}`, width: 480 * 210 / 297, height: 480, style: { objectFit: 'contain', flexShrink: 0 } }),
  h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, height: '100%', justifyContent: 'space-between' } },
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      h('div', { style: { fontSize: 32, fontWeight: 700, color: palette.accent } }, zh ? 'AI 趋势周刊' : 'AI Trends Weekly'),
      h('div', { style: { fontSize: 20, color: palette.muted, fontFamily: 'JetBrains Mono' } }, `NO. ${issue.number}  /  ${weeklyArticleCount(issue)} ${zh ? '篇阅读' : 'reads'} · ${issue.topics.length} ${zh ? '个主题' : 'themes'}`),
    ),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 24 } },
      h('div', { style: { display: 'flex', flexDirection: 'column', fontSize: 52, fontWeight: 700, lineHeight: 1.2 } },
        ...issue.title[lang].map((line) => h('div', { key: line }, line)),
      ),
      h('div', { style: { fontSize: 24, lineHeight: 1.5, color: palette.muted } }, issue.description[lang].replaceAll('’', "'")),
    ),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, borderTop: `1px solid ${palette.rule}`, paddingTop: 20, fontSize: 20 } },
      h('div', { style: { fontFamily: 'JetBrains Mono' } }, weeklyDateLabel(issue)),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', color: palette.muted } },
        h('span', null, zh ? '编辑 Airing' : 'Edited by Airing'), h('span', null, 'ursb.me'),
      ),
    ),
  ));
  const svg = await satori(tree, {
    width: 1200, height: 600,
    fonts: [
      { name: 'Noto Sans SC', data: regular, weight: 400, style: 'normal' },
      { name: 'Noto Sans SC', data: bold, weight: 700, style: 'normal' },
      { name: 'JetBrains Mono', data: mono, weight: 500, style: 'normal' },
    ],
  });
  return sharp(new Resvg(svg).render().asPng()).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}
