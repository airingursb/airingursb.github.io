export type SceneKind = 'marina' | 'busan';
export interface MemoryNote { title: string; body: string; label: string; shortTitle: string; subtitle: string; }
interface Story {
  slug: string;
  headline: readonly [string, string];
  deck: readonly [string, string];
  caption: string;
  liveLabel: string;
  pausedLabel: string;
  resumeLabel: string;
  sound: string;
  source: string;
  sourceImage: string;
  sourceAlt: string;
  interpretation: string;
  memories: readonly MemoryNote[];
}
export const stories: Record<SceneKind, Story> = {
  marina: {
    slug: 'rainy-marina-bay', headline: ['把一场雨，','留在这里。'],
    deck: ['那些计划之外的小事，','后来，都成了舍不得忘记的日常。'],
    caption: '滨海湾 · 一场计划外的雨', liveLabel: '雨还在下', pausedLabel: '雨，被留在这一刻', resumeLabel: '继续下雨', sound: '雨声',
    source: '2026/7/18，我们骑着两辆自行车去滨海湾海边溜达。灰云压在金沙和海面上，路骑到一半忽然下起暴雨，只好钻进一个废弃的公交车站躲雨。雨声把城市隔远了，两个车轮停在屋檐外滴水，反而成了这一天最有意思的一段。晚上去吃跷脚牛肉，热汤把雨里的湿气慢慢收走。',
    sourceImage: '/diorama/comic-16.webp',
    sourceAlt: '原四格：熊猫和 Moflow 骑行滨海湾、遇到暴雨、在公交站躲雨，最后一起吃跷脚牛肉。',
    interpretation: '箱庭取自第三格「公交站躲雨」，空间与造型为故事的微缩演绎。',
    memories: [
      {title:'雨声把城市隔远了',body:'只好钻进一个废弃的公交车站躲雨。并排坐着，反而成了这一天最有意思的一段。',label:'公交站 · 一起等雨停',shortTitle:'屋檐下',subtitle:'一起等雨停'},
      {title:'两个车轮，暂时停下来',body:'我们骑着两辆自行车去滨海湾。路骑到一半，忽然下起暴雨。车轮停在屋檐外，一点一点滴水。',label:'自行车 · 计划外的停留',shortTitle:'两个车轮',subtitle:'计划外的停留'},
      {title:'灰云下的滨海湾',body:'灰云压在金沙和海面上。原本只是去海边溜达，最后记住的，却是这场突如其来的雨。',label:'海湾 · 那天的远处',shortTitle:'远处的海湾',subtitle:'灰云压低了城市'},
    ],
  },
  busan: {
    slug: 'busan-birthday-sea', headline: ['把海风，','留给生日。'],
    deck: ['路的尽头是海，','灯光、海风和烟火气，把这一天慢慢收好。'],
    caption: '釜山 · 生日这天的夜海', liveLabel: '海风轻轻吹', pausedLabel: '海，被留在这一刻', resumeLabel: '继续看海', sound: '海浪',
    source: '2026/6/30，生日这天去了釜山。海滨城市先给了一阵海风，路的尽头就是海；吃了很多海鲜，生日被鲜味填满；晚上又看了夜海和灯塔，逛了热闹的夜市。灯光、海风和烟火气，慢慢把这一天收好。',
    sourceImage: '/diorama/comic-15.webp',
    sourceAlt: '原四格：生日这天抵达釜山、在海边吹风、吃海鲜，晚上沿着有红灯塔的夜海逛夜市。',
    interpretation: '箱庭取自第四格「夜海与夜市」。海岸、店铺与坐姿是故事的微缩演绎，不对应某一处真实街景。',
    memories: [
      {title:'生日这天，坐在海风里',body:'海滨城市先给了一阵海风。把脚步放慢一点，在热闹的夜市旁边，留一会儿给海。',label:'海边 · 一起坐坐',shortTitle:'海边坐坐',subtitle:'把脚步放慢一点'},
      {title:'远处，有一点红',body:'晚上又看了夜海和灯塔。红灯落进水里，海浪把这一点光轻轻揉开。',label:'灯塔 · 夜海里的光',shortTitle:'一点红',subtitle:'灯塔把夜海照亮'},
      {title:'生日被鲜味填满',body:'吃了很多海鲜，晚上又逛了热闹的夜市。灯光和烟火气，慢慢把这一天收好。',label:'夜市 · 生日的烟火气',shortTitle:'暖灯下',subtitle:'海鲜与生日的烟火气'},
    ],
  },
};
