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
  {
  "number": "003",
  "slug": "southern-ridges-sky",
  "title": "把天空留给自己",
  "date": "2026-08-15",
  "place": "新加坡 · 南部山脊",
  "description": "走进树荫，在桥上躺下来。Moflow 趴在身上，几只鸟从蓝天飞过，什么也不用赶。",
  "memory": "木桥、树影和飞鸟。躺下来，才发现天空一直都在。",
  "cover": "/diorama/covers/southern-ridges-sky.webp",
  "coverAlt": "森林木桥箱庭：熊猫仰躺在桥上，Moflow 趴在身上，树枝上有松鼠，鸟儿飞过树冠。",
  "comicIssue": 17,
  "tags": [
    "林间木桥",
    "松鼠",
    "仰望蓝天"
  ]
},
  {
  "number": "004",
  "slug": "hidden-sauna",
  "title": "回家路上的小宝藏",
  "date": "2026-06-01",
  "place": "新加坡 · 小区",
  "description": "工作、散步、烤肉饭之后，意外发现小区里的桑拿房。暖木、热气和门外的小灯，把一天慢慢收好。",
  "memory": "原来宝藏，有时就藏在回家的路上。",
  "cover": "/diorama/covers/hidden-sauna.webp",
  "coverAlt": "桑拿房剖面箱庭：熊猫坐在暖木长凳上，石炉升起热气，Moflow 坐在植物和小灯旁的门口。",
  "comicIssue": 8,
  "tags": [
    "暖木小屋",
    "慢慢放松",
    "意外发现"
  ]
},
].sort((a,b) => b.date.localeCompare(a.date));

export const dioramaUrl = (scene: Diorama) => `/diorama/${scene.slug}/`;
