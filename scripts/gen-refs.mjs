#!/usr/bin/env node
// Generate Moflow-ink reference candidates.
// One-time script; rerun if the author ever wants a new candidate set.
//
// Usage: GEMINI_API_KEY=... node scripts/gen-refs.mjs [count]
//
// Outputs: ./tmp-refs/moflow-ink-{1..N}.png — author picks one, copies to
// services/blog-api/refs/moflow-ink.png.

import { GoogleGenAI } from '@google/genai';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const COUNT = parseInt(process.argv[2] || '6', 10);
const OUT_DIR = resolve('./tmp-refs');
const MOFLOW_LOGO = resolve('../shuxin/app/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png');

const STYLE_PROMPT = (await readFile('./services/blog-api/refs/style-prompt.md', 'utf8'))
  .split('---')[1]; // strip header

const PROMPT = `${STYLE_PROMPT}

Task: Take the attached source image (a 3D rendered blue blob mascot with large eyes, a small tuft on top, holding a pink heart) and re-render it in the locked ink-wash style described above.

Specifically:
- Keep the recognizable silhouette (rounded teardrop body, big dark eyes, small tuft on top, the heart).
- Convert the 3D glossy rendering to flat black-and-white ink wash with organic brushstroke.
- Allow a tiny pink wash on the heart only (the rest is monochrome).
- Single character on a white background.
- Square 1:1, isolated subject, no panel borders.`;

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Set GEMINI_API_KEY in env.');
  }
  await mkdir(OUT_DIR, { recursive: true });

  const sourceImg = await readFile(MOFLOW_LOGO);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  for (let i = 1; i <= COUNT; i++) {
    process.stdout.write(`Generating candidate ${i}/${COUNT}... `);
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            {
              inlineData: {
                mimeType: 'image/png',
                data: sourceImg.toString('base64'),
              },
            },
          ],
        },
      ],
    });

    const imagePart = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart) {
      console.log('FAIL (no image in response)');
      continue;
    }
    const buf = Buffer.from(imagePart.inlineData.data, 'base64');
    const outPath = join(OUT_DIR, `moflow-ink-${i}.png`);
    await writeFile(outPath, buf);
    console.log(`-> ${outPath}`);
  }

  console.log(`\nDone. Review candidates in ${OUT_DIR}/`);
  console.log('Pick one and copy to services/blog-api/refs/moflow-ink.png');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
