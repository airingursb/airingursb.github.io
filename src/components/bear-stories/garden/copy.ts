export const gardenCopy = {
  zh: {
    scene: '小熊和大家一起照料的小花园', water: '帮小熊提起水壶，浇一点水',
    waiting: '正在看看花园。', ready: '今天，也给花园一点水。',
    saving: '小熊提起水壶，正在记录这次浇水。',
    saved: '今天的水浇好了。花园会记住这一点照料。',
    already: '今天已经浇过水了。再陪小熊待一会儿。',
    offline: '暂时没能记下浇水。点水壶可以重试。',
    unavailable: '暂时连不上花园。先陪小熊坐一会儿，稍后再试。',
    session: '浏览器未保存花园身份，浇水没有记入。允许此站点 Cookie 后再试。',
    simulation: '正在查看生长静帧，不会写入共享花园。',
    local: '小熊的花园', localOnly: '正在看看小熊的花园；此页面不记录共享浇水。',
    shared: '一起照料的小花园', media: '动作暂时没能加载，浇水结果仍以共享状态为准。',
    stages: { seed: '种子', sprout: '萌芽', bud: '花苞', bloom: '开花' },
  },
  en: {
    scene: 'A little garden tended by the bear and its visitors', water: 'Help the bear lift the can and water the garden',
    waiting: 'Checking on the garden.', ready: 'A little water for the garden today.',
    saving: 'The bear is lifting the can. Saving this watering.',
    saved: 'Today’s watering is saved. The garden remembers the care.',
    already: 'You have watered today. Stay a little longer with the bear.',
    offline: 'The watering could not be saved. Tap the can to try again.',
    unavailable: 'The garden is temporarily unavailable. Stay a little with the bear and try again later.',
    session: 'Your browser did not save a garden identity. Allow this site’s cookies and try again.',
    simulation: 'Viewing a growth still. This does not change the shared garden.',
    local: 'The bear’s garden', localOnly: 'Enjoy the bear’s garden. This page does not record shared waterings.',
    shared: 'Our little garden', media: 'The motion could not load. The shared state still reports the watering result.',
    stages: { seed: 'Seed', sprout: 'Sprout', bud: 'Bud', bloom: 'Bloom' },
  },
} as const;

export type GardenLanguage = keyof typeof gardenCopy;
export type GardenStage = keyof typeof gardenCopy.zh.stages;
