const root = document.querySelector<HTMLElement>('[data-living-exhibit]');
if (root) {
  const en = root.dataset.lang === 'en';
  const desk = root.querySelector<HTMLElement>('bear-home-study');
  const garden = root.querySelector<HTMLElement>('[data-garden-demo]');
  const status = root.querySelector<HTMLElement>('[data-scene-status]');
  const scenarios = {
    morning: { hour: '9', weather: 'sunny', zh: '09:00 · 晴天 · 慢慢醒来', en: '09:00 · Clear skies · A slow start' },
    work: { hour: '12', weather: 'sunny', zh: '12:00 · 晴天 · 写一会代码', en: '12:00 · Clear skies · Time to code' },
    afternoon: { hour: '15', weather: 'cloudy', zh: '15:00 · 多云 · 读一会书', en: '15:00 · Cloudy · A little reading' },
    rain: { hour: '15', weather: 'rainy', zh: '15:00 · 下雨 · 留在屋里听雨', en: '15:00 · Rain · Staying indoors' },
    night: { hour: '23', weather: 'sunny', zh: '23:00 · 深夜 · 台灯亮了', en: '23:00 · Night · The lamp is on' },
  };
  const send = (detail: { readonly action?: string; readonly paused?: boolean }) => desk?.dispatchEvent(new CustomEvent('bear-demo', { detail }));
  const pause = (button: HTMLButtonElement, scope: HTMLElement | null) => {
    const paused = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = paused ? (en ? 'Resume motion' : '继续动作') : (en ? 'Pause motion' : '暂停动作');
    if (scope) scope.dataset.demoPaused = String(paused);
    return paused;
  };
  root.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!button) return;
    const key = Object.keys(scenarios).find((id): id is keyof typeof scenarios => id === button.dataset.scenario);
    if (key && desk) {
      const scenario = scenarios[key];
      desk.dataset.demoHour = scenario.hour;
      desk.dataset.demoWeather = scenario.weather;
      if (garden) { garden.dataset.demoHour = scenario.hour; garden.dataset.demoWeather = scenario.weather; }
      desk.dispatchEvent(new Event('bear-demo-context'));
      root.querySelectorAll('[data-scenario]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
      if (status) status.textContent = en ? scenario.en : scenario.zh;
    }
    if (button.dataset.demoClip) {
      send({ action: button.dataset.demoClip });
      if (status) status.textContent = `${en ? 'Requested: ' : '已点选：'}${button.textContent} · ${en ? 'finishing the current action' : '等待动作自然收尾'}`;
    }
    if (button.hasAttribute('data-desk-pause')) send({ paused: pause(button, desk) });
    if (button.hasAttribute('data-garden-pause')) pause(button, garden);
    if (button.hasAttribute('data-greet')) garden?.querySelector<HTMLButtonElement>('[data-footer-bear]')?.click();
    if (button.hasAttribute('data-garden-book')) garden?.querySelector<HTMLButtonElement>('[data-book]')?.click();
  });
  const details = root.querySelector<HTMLDetailsElement>('[data-mail-demo]');
  const footer = root.querySelector<HTMLElement>('bear-footer-scene');
  const mailStatus = root.querySelector<HTMLElement>('[data-mail-status]');
  const sendButton = root.querySelector<HTMLButtonElement>('[data-send-demo]');
  let deliveryTimer = 0;
  const syncMailbox = () => { if (footer) footer.dataset.mailboxOpen = String(details?.open ?? false); };
  details?.addEventListener('toggle', syncMailbox);
  root.querySelector('[data-footer-subscribe]')?.addEventListener('click', () => {
    if (details) { details.open = true; syncMailbox(); sendButton?.focus({ preventScroll: true }); }
  });
  sendButton?.addEventListener('click', () => {
    if (!footer || !garden) return;
    clearTimeout(deliveryTimer);
    footer.dataset.mailState = 'sending';
    sendButton.disabled = true;
    if (mailStatus) mailStatus.textContent = en ? 'Rehearsing delivery…' : '正在演示投递…';
    deliveryTimer = window.setTimeout(() => {
      footer.dataset.mailState = 'sent';
      garden.dispatchEvent(new Event('bear-letter-sent'));
      sendButton.disabled = false;
      if (mailStatus) mailStatus.textContent = en ? 'Rehearsal complete. No email was sent.' : '演示完成，没有发送邮件。';
    }, 700);
  });
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const reflectMotion = () => root.querySelectorAll<HTMLElement>('[data-motion-notice]').forEach(note => { note.hidden = !preference.matches; });
  preference.addEventListener('change', reflectMotion);
  reflectMotion();
  if (en) {
    const labels: Readonly<Record<string, string>> = {
      '关掉小熊的台灯': 'Turn off the bear’s lamp', '打开小熊的台灯': 'Turn on the bear’s lamp',
      '拉开小熊的窗帘': 'Open the curtain', '拉上小熊的窗帘': 'Close the curtain',
      '摸摸小熊': 'Pet the bear', '叫醒小熊': 'Wake the bear', '让小熊喝一口': 'Let the bear take a sip',
      '让小熊写代码': 'Let the bear type', '让小熊给植物浇水': 'Water the plant', '和小鸟打个招呼': 'Say hello to the bird',
      '一起读一页书': 'Read a passage together', '关闭预览': 'Close preview',
      '看看小熊书桌上的阅读收藏': 'Open the bear’s reading collection',
    };
    const localize = () => {
      root.querySelectorAll<HTMLElement>('[aria-label]').forEach(element => {
        const original = element.getAttribute('aria-label') || '';
        const label = labels[original] || (original.startsWith('读新文章：') ? `Read article: ${original.slice(5)}` : original.startsWith('看新旅行照片：') ? `View travel photo: ${original.slice(7)}` : '');
        if (label) element.setAttribute('aria-label', label);
      });
    };
    new MutationObserver(localize).observe(root, { subtree: true, attributes: true, attributeFilter: ['aria-label'] });
    localize();
  }
}
