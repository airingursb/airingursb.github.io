document.querySelectorAll<HTMLAnchorElement>('.story-link, .skip-link').forEach(link=>link.addEventListener('click',()=>{
  const story=document.querySelector('details'); if(story) story.open=true;
}));

import { stories } from './stories';

const host=document.querySelector<HTMLElement>('[data-world]');
if(host) {
  const sceneKind=host.dataset.scene;
  const kind=sceneKind==='busan'||sceneKind==='ridge'||sceneKind==='sauna'?sceneKind:'marina';
  const story=stories[kind];
  const status=document.querySelector<HTMLElement>('[data-status]');
  const memories=story.memories;
  const selects=document.querySelectorAll<HTMLButtonElement>('[data-memory]');
  selects.forEach(button=>button.addEventListener('click',()=>{
    const index=Number(button.dataset.memory),memory=memories[index]; if(!memory) return;
    selects.forEach(item=>item.setAttribute('aria-pressed',String(Number(item.dataset.memory)===index)));
    const title=document.querySelector('[data-memory-title]'),body=document.querySelector('[data-memory-body]'),label=document.querySelector('[data-memory-label]');
    if(title) title.textContent=memory.title;
    if(body) body.textContent=memory.body;
    if(label) label.textContent=memory.label;
  }));
  const poster=document.querySelector<HTMLElement>('[data-world-poster]');
  const start=async()=>{
  // three.js and the scene modules load only when the 3D view is wanted.
  try {
    const [{ createDiorama }, { createRainAudio }, { createSeaAudio }]=await Promise.all([import('./scene'), import('./weather'), import('./sea-audio')]);
    const world=createDiorama(host,kind);
    if(poster) poster.hidden=true;
    if(status) {status.hidden=false;status.textContent='正在请两位朋友坐下来…';}
    let active=true;
    void world.ready.then(()=>{if(active && status) status.hidden=true;},()=>{
      if(active && status) {status.hidden=false;status.textContent='角色暂时未能载入，请刷新重试。';}
    });
    host.dataset.ready='true';
    const pause=document.querySelector<HTMLButtonElement>('[data-action="pause"]');
    const sound=document.querySelector<HTMLButtonElement>('[data-action="sound"]');
    const audio=kind==='busan'?createSeaAudio():kind==='marina'?createRainAudio():null;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    let soundOn=false;
    const syncPause=()=>{
      if(pause) { pause.disabled=media.matches; pause.setAttribute('aria-pressed',String(world.isPaused())); pause.setAttribute('aria-label',world.isPaused()?story.resumeLabel:'定格这一刻'); }
      document.querySelectorAll<HTMLElement>('[data-weather-label]').forEach(label=>{label.textContent=world.isPaused()?story.pausedLabel:story.liveLabel;});
    };
    syncPause();
    const actions=document.querySelectorAll<HTMLButtonElement>('[data-action]');
    actions.forEach(button=>button.addEventListener('click',async()=>{
      switch(button.dataset.action) {
        case 'reset': world.reset(); break;
        case 'in': world.zoom(.15); break;
        case 'out': world.zoom(-.15); break;
        case 'pause': world.setPaused(!world.isPaused()); syncPause(); break;
        case 'sound':
          if(!audio) break;
          try {
            await audio.setPlaying(!soundOn); soundOn=!soundOn;
            if(sound) { sound.setAttribute('aria-pressed',String(soundOn)); sound.setAttribute('aria-label',soundOn?`关闭${story.sound}`:`听听${story.sound}`); }
          } catch(error) {
            if(!(error instanceof Error)) throw error;
            if(status) {status.hidden=false;status.textContent=`${story.sound}暂时无法播放，你仍然可以继续看这个小世界。`;}
          }
          break;
      }
    }));
    const updateMotion=()=>{if(media.matches) world.setPaused(true);syncPause();};
    media.addEventListener('change',updateMotion);
    window.addEventListener('pagehide',event=>{
      if(event.persisted || !active) return;
      active=false;world.dispose();audio?.dispose();media.removeEventListener('change',updateMotion);
    });
  } catch(error) {
    if(!(error instanceof Error)) throw error;
    host.dataset.ready='false';
    if(status) {status.hidden=false;status.textContent='这个浏览器暂时无法打开 3D。往下展开四格，仍然可以读到这一天的故事。';}
    document.querySelectorAll<HTMLButtonElement>('[data-action], [data-hotspot]').forEach(button=>button.disabled=true);
  }
  };
  // H7: phones and touch tablets show the still poster first; the 3D scene
  // (three.js plus up to ~10MB of plush models) loads on request, or by itself
  // only on a fast, unmetered connection.
  const connection=(navigator as Navigator & {connection?: {saveData?: boolean; effectiveType?: string; downlink?: number}}).connection;
  const fastNetwork=Boolean(connection && !connection.saveData && connection.effectiveType==='4g' && (connection.downlink??0)>=10);
  const compact=window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const startButton=document.querySelector<HTMLButtonElement>('[data-world-start]');
  if(compact && !fastNetwork && poster && startButton) {
    host.dataset.deferred='true';
    if(status) status.hidden=true;
    const gated=document.querySelectorAll<HTMLButtonElement>('[data-action]');
    gated.forEach(button=>button.disabled=true);
    const posterActions=poster.querySelector<HTMLElement>('[data-world-poster-actions]');
    posterActions?.removeAttribute('hidden');
    startButton.addEventListener('click',()=>{
      host.dataset.deferred='false';
      if(posterActions) posterActions.hidden=true;
      gated.forEach(button=>button.disabled=false);
      if(status) {status.hidden=false;status.textContent='正在把这一天，慢慢拼起来…';}
      void start();
    },{once:true});
  } else {
    void start();
  }
}
