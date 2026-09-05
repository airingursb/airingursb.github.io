document.querySelectorAll<HTMLAnchorElement>('.story-link, .skip-link').forEach(link=>link.addEventListener('click',()=>{
  const story=document.querySelector('details'); if(story) story.open=true;
}));

import { createDiorama } from './scene';
import { createRainAudio } from './weather';
import { createSeaAudio } from './sea-audio';
import { stories } from './stories';

const host=document.querySelector<HTMLElement>('[data-world]');
if(host) {
  const kind=host.dataset.scene==='busan'?'busan':'marina';
  const story=stories[kind];
  const status=document.querySelector<HTMLElement>('[data-status]');
  try {
    const world=createDiorama(host,kind);
    if(status) {status.hidden=false;status.textContent='正在请两位朋友坐下来…';}
    let active=true;
    void world.ready.then(()=>{if(active && status) status.hidden=true;},()=>{
      if(active && status) {status.hidden=false;status.textContent='角色暂时未能载入，请刷新重试。';}
    });
    host.dataset.ready='true';
    const pause=document.querySelector<HTMLButtonElement>('[data-action="pause"]');
    const sound=document.querySelector<HTMLButtonElement>('[data-action="sound"]');
    const audio=kind==='busan'?createSeaAudio():createRainAudio();
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
    const updateMotion=()=>{if(media.matches) world.setPaused(true);syncPause();};
    media.addEventListener('change',updateMotion);
    window.addEventListener('pagehide',event=>{
      if(event.persisted || !active) return;
      active=false;world.dispose();audio.dispose();media.removeEventListener('change',updateMotion);
    });
  } catch(error) {
    if(!(error instanceof Error)) throw error;
    host.dataset.ready='false';
    if(status) {status.hidden=false;status.textContent='这个浏览器暂时无法打开 3D。往下展开四格，仍然可以读到这一天的故事。';}
    document.querySelectorAll<HTMLButtonElement>('[data-action], [data-hotspot]').forEach(button=>button.disabled=true);
  }
}
