import photos from '../../../data/photos.json';

export type Language = 'zh' | 'en';
export const albumName = '2024 New Zealand';
export const albumHref = '/photos/albums/2024-new-zealand/';
export const albumPhotos = photos.filter(photo => photo.albums?.includes(albumName));

const objects = [
  { slug: 'img-2604', object: 'roofs', zh: '屋顶：打开日出照片', en: 'Roofs: open the sunrise photograph' },
  { slug: 'img-2251', object: 'shore', zh: '岸边：打开海岸照片', en: 'Shore: open the coast photograph' },
  { slug: 'dscf0841', object: 'tree', zh: '秋树：打开秋叶照片', en: 'Autumn tree: open the leaf photograph' },
] as const;

export const memories = objects.flatMap(object => {
  const photo = albumPhotos.find(item => item.slug === object.slug);
  return photo ? [{ ...object, photo }] : [];
});

export function formatDate(value: string | null): string {
  if (!value) return '';
  return `${value.slice(0, 10)} · ${value.slice(11, 16)} UTC`;
}

export const copy = {
  zh: {
    title: '箱子里的远方', description: '小熊旅行箱 · 验收预览', heading: 'Photos',
    intro: '收进行李箱的，不只是行李。', destination: '新西兰，2024',
    count: '张照片', open: '打开旅行箱', close: '关闭旅行箱', pack: '收好这段旅程',
    album: '打开完整相册', photo: '查看原始照片', back: '四个小故事',
    preview: '验收预览 05', instructions: '轻点箱扣。等小城展开后，试试屋顶、岸边与秋树；也可以用 Tab 选择，Esc 返回。',
    opening: '小熊正在打开旅行箱。', ready: '小城展开了，可以选择屋顶、岸边和秋树查看照片。',
    closing: '小熊正在收好旅行箱。', closed: '旅行箱已经收好。',
    fallback: '动画暂时不可用，已打开完整场景。照片和相册仍可查看。',
    unavailable: '照片暂时无法载入。', selected: '已展开照片：',
    archive: '旅途留下的照片', archiveDescription: '2024 New Zealand',
    hint: '相册中的三个片刻，藏在小城里。',
  },
  en: {
    title: 'A little world, packed away', description: 'The bear’s suitcase · Acceptance preview', heading: 'Photos',
    intro: 'Some journeys fit inside a suitcase.', destination: 'New Zealand, 2024',
    count: 'photographs', open: 'Open the suitcase', close: 'Close the suitcase', pack: 'Pack the journey away',
    album: 'Open the full album', photo: 'View the original photograph', back: 'Four little stories',
    preview: 'ACCEPTANCE PREVIEW 05', instructions: 'Tap the clasp. Once the town unfolds, explore the roofs, shore and autumn tree. Tab selects an object; Esc returns.',
    opening: 'The bear is opening the suitcase.', ready: 'The town is open. Choose the roofs, shore or autumn tree to see a photograph.',
    closing: 'The bear is packing the suitcase.', closed: 'The suitcase is packed away.',
    fallback: 'The animation is unavailable. The complete scene, photographs and album remain available.',
    unavailable: 'This photograph could not load.', selected: 'Photograph opened: ',
    archive: 'Photographs from the journey', archiveDescription: '2024 New Zealand',
    hint: 'Three moments from the album, hidden in a little town.',
  },
} as const;
