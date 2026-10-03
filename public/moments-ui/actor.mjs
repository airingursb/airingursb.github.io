export function createProjector(){
 const host=document.getElementById('actor-moments'),canvas=host.querySelector('canvas'),context=canvas.getContext('2d'),button=document.getElementById('pause-moments');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let visible=false,userPaused=false,wanted=false,frame=0,manifest,sheet,clip,timer=0,entered=false,request=0;
 function sync(){
  clearTimeout(timer);timer=0;
  const can=wanted&&!userPaused&&visible&&!document.hidden&&!reduce.matches&&!document.getElementById('image-dialog').open;
  host.dataset.playing=String(can);button.textContent=userPaused?'继续动画':'暂停动画';button.setAttribute('aria-pressed',String(userPaused));button.setAttribute('aria-label',userPaused?'继续小熊动画':'暂停小熊动画');
  if(can&&sheet)timer=setTimeout(()=>{
   frame++;if(frame>=clip.frames){frame=clip.frames-1;wanted=false;}
   context.clearRect(0,0,manifest.width,manifest.height);context.drawImage(sheet,(frame%manifest.columns)*manifest.width,Math.floor(frame/manifest.columns)*manifest.height,manifest.width,manifest.height,0,0,manifest.width,manifest.height);host.dataset.frame=frame;sync();
  },1000/manifest.fps);
 }
 async function play(action='project'){
  if(reduce.matches||userPaused)return;
  const current=++request;
  try{
   if(!manifest){const response=await fetch(host.dataset.base+'/manifest.json');if(!response.ok)throw Error('manifest');manifest=await response.json();canvas.width=manifest.width;canvas.height=manifest.height;}
   clip=manifest.clips[action]||manifest.clips.project;
   const image=new Image();image.src=host.dataset.base+'/'+clip.asset;await image.decode();if(current!==request)return;
   sheet=image;frame=0;wanted=true;host.dataset.ready='true';sync();
  }catch{wanted=false;host.dataset.ready='false';sync();}
 }
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible&&!entered){entered=true;play();}sync();},{threshold:.15}).observe(host);
 button.addEventListener('click',()=>{userPaused=!userPaused;sync();});
 host.querySelector('[data-play]').addEventListener('click',()=>play());
 document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);
 return {play,sync};
}
