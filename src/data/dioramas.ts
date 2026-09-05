export interface Diorama {
  number: string;
  slug: string;
  title: string;
  date: string;
  place: string;
  description: string;
  memory: string;
  cover: string;
  coverAlt: string;
  comicIssue: number;
  tags: readonly string[];
}

export const dioramas: readonly Diorama[] = [
  {
    number: '001',
    slug: 'rainy-marina-bay',
    title: '雨里的滨海湾',
    date: '2026-07-18',
    place: '新加坡 · 滨海湾',
    description: '骑行到一半，突然下起了雨。两个车轮停在屋檐外，我们并排坐着，等城市慢慢安静下来。',
    memory: '计划外的一场雨，成了舍不得忘记的一天。',
    cover: '/diorama/covers/rainy-marina-bay.webp',
    coverAlt: '滨海湾微缩场景：熊猫与 Moflow 在公交站长椅上躲雨，两辆自行车停在旁边，远处是金沙酒店。',
    comicIssue: 16,
    tags: ['一场雨', '两辆车', '一起等'],
  },
  {
    number: '002',
    slug: 'busan-birthday-sea',
    title: '把海风留给生日',
    date: '2026-06-30',
    place: '韩国 · 釜山',
    description: '生日这天去了釜山。路的尽头是海，暖灯下是夜市，海风和烟火气把这一天慢慢收好。',
    memory: '夜海、红灯塔，还有被鲜味填满的生日。',
    cover: '/diorama/covers/busan-birthday-sea.webp',
    coverAlt: '釜山生日夜海箱庭：红灯塔立在防波堤上，小渔船漂在蓝色海面，熊猫与 Moflow 坐在暖灯夜市旁。',
    comicIssue: 15,
    tags: ['夜海', '红灯塔', '生日的烟火气'],
  },
];

export const dioramaUrl = (scene: Diorama) => `/diorama/${scene.slug}/`;
