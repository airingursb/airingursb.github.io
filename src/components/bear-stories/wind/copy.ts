export const windCopy = {
  zh: {
    close: '关上窗户，帮小熊挡住风', open: '打开窗户，吹来一阵新风',
    paperweight: '把纸镇递给小熊',
    gust: '小熊自己把杯子压在纸上，收拾好了书桌。',
    weighted: '小熊用纸镇压住书页，接稳了杯子。',
    closed: '窗户关好了。小熊收回纸页，安心读书。',
    failure: '动作暂时无法载入，已保留静态场景；仍可使用窗户和纸镇。',
  },
  en: {
    close: 'Close the window to stop the gust', open: 'Open the window for another breeze',
    paperweight: 'Pass the paperweight to the bear',
    gust: 'The bear has pinned the loose pages with its cup and tidied the desk.',
    weighted: 'The bear has weighted the book and caught its cup.',
    closed: 'The window is closed. The bear has collected the pages and returned to reading.',
    failure: 'The animation could not load. A still scene and both controls remain available.',
  },
} as const;
