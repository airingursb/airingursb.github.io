import {esc,safeUrl,renderTimeline,normalizeMoment,fetchAllMoments} from './core.mjs';
import {createProjector} from './actor.mjs';
const $=id=>document.getElementById(id);
const {moments,comics}=window.MOMENTS_DATA;
const cached=new Map(moments.map(m=>[m.id,m]));
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let momentPage=1,momentType='all',momentYear='all',momentMonth='all',projection=0;
const actor=createProjector();const play=action=>actor.play(action);
 function paginate(id,current,total,onSelect){
  const count=Math.max(1,Math.ceil(total/6)),nav=$(id);nav.replaceChildren();
  const button=(label,page,disabled=false,active=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.dataset.page=String(page);if(active)b.setAttribute('aria-current','page');b.setAttribute('aria-label',label==='←'?'上一页':label==='→'?'下一页':`第 ${page} 页`);b.addEventListener('click',()=>onSelect(page));nav.append(b);};
  button('←',current-1,current===1);
  const pages=new Set([1,count,current,current-1,current+1]);let last=0;
  for(const p of [...pages].filter(p=>p>=1&&p<=count).sort((a,b)=>a-b)){if(p-last>1){const dots=document.createElement('span');dots.className='meta';dots.textContent='…';nav.append(dots);}button(String(p),p,false,p===current);last=p;}
  button('→',current+1,current===count);
  const caption=document.createElement('span');caption.className='page-caption';caption.textContent=`${current} / ${count} 页`;nav.append(caption);
 }
 function chooseProjection(index,animate=true){
  projection=(index+comics.length)%comics.length;const c=comics[projection];if(!c)return;
  $('projection-image').src=c.image;$('projection-image').alt=c.title;$('projection-thumb').setAttribute('aria-label','放大四格：'+c.title);$('comic-selection-label').textContent='No. '+c.id+' · '+c.title;
  $('open-projection').setAttribute('aria-label',`展开查看《${c.title}》`);
  document.querySelectorAll('[data-comic]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.comic)===projection)));
  if(animate)play('project');
 }
 $('film-rail').innerHTML=comics.map((c,i)=>`<button class="film-card" data-comic="${i}" aria-pressed="${i===0}" aria-label="放映四格：${esc(c.title)}"><img src="${esc(c.image)}" alt="${esc(c.title)}" width="320" height="320" loading="lazy"><span class="meta">No. ${esc(c.id)} · ${esc(c.date)}</span><strong>${esc(c.title)}</strong></button>`).join('');
 $('film-rail').addEventListener('click',e=>{const b=e.target.closest('[data-comic]');if(b){const i=Number(b.dataset.comic);chooseProjection(i);if(matchMedia('(max-width:700px)').matches){const c=comics[i];openImage(c.image,c.title,c.url);}}});
 $('more-comics').addEventListener('click',()=>{const expanded=$('film-rail').classList.toggle('expanded');$('more-comics').setAttribute('aria-expanded',String(expanded));$('more-comics').textContent=expanded?'收起存档 ↑':'翻看全部 12 期 ↓';});
 let momentYears=[...new Set(moments.map(m=>m.date.slice(0,4)))].sort().reverse();
 let calendarYear=momentYears[0]||String(new Date().getFullYear());
 const calendar=$('moment-calendar'),dateTrigger=$('moment-date-trigger');
 const checkGlyph='<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>';
 function syncYears(){momentYears=[...new Set(moments.map(m=>m.date.slice(0,4)))].sort().reverse();if(!momentYears.includes(calendarYear))calendarYear=momentYears[0]||String(new Date().getFullYear());$('calendar-year').innerHTML=momentYears.map(year=>`<option value="${year}">${year} 年</option>`).join('')||'<option>暂无动态</option>';$('calendar-year').disabled=!momentYears.length;}
 syncYears();
 function momentMatchesType(moment){return momentType==='all'||(momentType==='photo'?!!moment.photo:!moment.photo);}
 function monthActivity(){
  const counts=new Map();
  moments.filter(momentMatchesType).forEach(moment=>{const key=moment.date.slice(0,7);counts.set(key,(counts.get(key)||0)+1);});
  return counts;
 }
 function renderMomentCalendar(){
  const counts=monthActivity(),max=Math.max(1,...counts.values());
  const heat=count=>count?Math.min(4,Math.ceil(count/max*4)):0;
  const keys=Array.from({length:12},(_,index)=>calendarYear+'-'+String(index+1).padStart(2,'0'));
  const total=keys.reduce((sum,key)=>sum+(counts.get(key)||0),0),index=momentYears.indexOf(calendarYear);
  $('calendar-year').value=calendarYear;$('calendar-year-prev').disabled=index>=momentYears.length-1;$('calendar-year-next').disabled=index<=0;
  $('calendar-summary').textContent=`${calendarYear} 年 · ${total} 则${momentType==='photo'?'有照片的':momentType==='text'?'文字':''}动态`;
  $('calendar-months').innerHTML=keys.map((key,index)=>{
   const count=counts.get(key)||0,selected=momentMonth===key;
   return `<button type="button" class="calendar-month" data-calendar-month="${key}" data-heat="${heat(count)}" aria-pressed="${selected}" aria-label="${calendarYear}年${index+1}月，${count}则${momentType==='photo'?'有照片的':momentType==='text'?'文字':''}动态${count?'':'，不可选择'}"${count?'':' disabled'}><span>${index+1}月</span><span class="calendar-month-count">${count} 则</span>${selected?checkGlyph:''}</button>`;
  }).join('');
  $('calendar-select-year').textContent='查看 '+calendarYear+' 全年';$('calendar-select-year').disabled=total===0;
  $('calendar-select-year').setAttribute('aria-pressed',String(momentYear===calendarYear&&momentMonth==='all'));
  $('calendar-select-all').setAttribute('aria-pressed',String(momentYear==='all'));
  $('moment-date-label').textContent=momentMonth!=='all'?momentYear+'年 '+Number(momentMonth.slice(5))+'月':momentYear!=='all'?momentYear+'年 · 全年':'全部时间';
  dateTrigger.setAttribute('aria-label','选择时间：'+$('moment-date-label').textContent);
  document.querySelector('.month-archive .rail-title span').textContent=calendarYear;
  $('month-index').innerHTML=`<button data-month="all" aria-pressed="${momentYear==='all'}">全部时间</button>`+keys.map((key,index)=>{
   const count=counts.get(key)||0;
   return `<button data-month="${key}" aria-pressed="${momentMonth===key}"${count?'':' disabled'}><span class="archive-heat" data-heat="${heat(count)}" aria-hidden="true"></span><span>${index+1}月</span><span class="archive-month-count">${count}</span></button>`;
  }).join('');
 }
 function placeMomentCalendar(){
  if(!calendar.matches(':popover-open'))return;
  const rect=dateTrigger.getBoundingClientRect(),height=calendar.offsetHeight,width=calendar.offsetWidth;
  const below=innerHeight-rect.bottom,above=rect.top;
  calendar.style.left=Math.max(20,Math.min(rect.left,innerWidth-width-20))+'px';
  calendar.style.top=Math.max(16,Math.min(below<height+8&&above>below?rect.top-height-8:rect.bottom+8,innerHeight-height-16))+'px';
 }
 function closeMomentCalendar(restoreFocus=true){
  if(!$('moment-calendar').matches(':popover-open'))return;
  $('moment-calendar').hidePopover();if(restoreFocus)$('moment-date-trigger').focus({preventScroll:true});
 }
 calendar.addEventListener('beforetoggle',event=>{
  dateTrigger.setAttribute('aria-expanded',String(event.newState==='open'));
  if(event.newState==='open'){calendarYear=momentYear==='all'?calendarYear:momentYear;renderMomentCalendar();}
 });
 calendar.addEventListener('toggle',event=>{
  if(event.newState==='open'){placeMomentCalendar();(calendar.querySelector('.calendar-month[aria-pressed=true]')||$('calendar-year')).focus({preventScroll:true});}
 });
 calendar.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMomentCalendar();return;}
  const button=event.target.closest('[data-calendar-month]');
  if(!button||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
  event.preventDefault();const buttons=[...$('calendar-months').children],current=buttons.indexOf(button);
  let next=event.key==='Home'?0:event.key==='End'?11:current+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4}[event.key]);
  const step=event.key==='Home'?1:event.key==='End'?-1:({ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4}[event.key]);
  while(next>=0&&next<buttons.length){if(!buttons[next].disabled){buttons[next].focus();break;}next+=step;}
 });
 document.addEventListener('focusin',event=>{
  if(!$('moment-date-picker').contains(event.target))closeMomentCalendar(false);
 });
 $('moment-calendar-close').addEventListener('click',()=>closeMomentCalendar());
 window.addEventListener('resize',placeMomentCalendar);window.addEventListener('scroll',placeMomentCalendar,{passive:true});
 $('calendar-year').addEventListener('change',()=>{calendarYear=$('calendar-year').value;renderMomentCalendar();});
 for(const [id,step] of [['calendar-year-prev',1],['calendar-year-next',-1]])$(id).addEventListener('click',()=>{
  const next=momentYears[momentYears.indexOf(calendarYear)+step];if(next){calendarYear=next;renderMomentCalendar();}
 });
 function selectMomentMonth(month){
  if(month!=='all'&&!monthActivity().get(month))return;
  momentMonth=month;momentYear=month==='all'?'all':month.slice(0,4);if(momentYear!=='all')calendarYear=momentYear;
  momentPage=1;renderMoments();play('project');closeMomentCalendar();
 }
 $('calendar-months').addEventListener('click',event=>{const button=event.target.closest('[data-calendar-month]');if(button&&!button.disabled)selectMomentMonth(button.dataset.calendarMonth);});
 $('calendar-select-all').addEventListener('click',()=>selectMomentMonth('all'));
 $('calendar-select-year').addEventListener('click',()=>{momentYear=calendarYear;momentMonth='all';momentPage=1;renderMoments();play('project');closeMomentCalendar();});
 $('month-index').addEventListener('click',e=>{const button=e.target.closest('[data-month]');if(button)selectMomentMonth(button.dataset.month);});
 $('moments-total').textContent=`${moments.length} 条动态`;
 function renderMoments(){
  const year=momentYear,month=momentMonth;
  renderMomentCalendar();
  const dated=moments.filter(moment=>(year==='all'||moment.date.startsWith(year))&&(month==='all'||moment.date.startsWith(month)));
  $('type-all-count').textContent=dated.length;$('type-photo-count').textContent=dated.filter(moment=>moment.photo).length;$('type-text-count').textContent=dated.filter(moment=>!moment.photo).length;
  const matches=dated.filter(moment=>momentType==='all'||(momentType==='photo'?!!moment.photo:!moment.photo));
  momentPage=Math.min(momentPage,Math.max(1,Math.ceil(matches.length/6)));$('moments-result').innerHTML=`<strong>${matches.length}</strong> 条${momentType==='photo'?'带照片的':momentType==='text'?'文字':''}记录${month!=='all'?' · '+month.replace('-',' 年 ')+' 月':year!=='all'?' · '+year+' 年':''}`;
  $('moment-reset').hidden=year==='all'&&month==='all'&&momentType==='all';
  const shown=matches.slice((momentPage-1)*6,momentPage*6);
  document.dispatchEvent(new Event('moments:before-render'));
  $('moment-list').innerHTML=renderTimeline(shown,matches);
  document.dispatchEvent(new Event('moments:rendered'));
  paginate('moments-pager',momentPage,matches.length,p=>{momentPage=p;renderMoments();play('project');$('moments-index-title').focus({preventScroll:true});$('moments-index-title').scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});});
  document.querySelectorAll('[data-type]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.type===momentType));
   button.disabled=dated.filter(moment=>button.dataset.type==='all'||(button.dataset.type==='photo'?!!moment.photo:!moment.photo)).length===0;
  });
 }
 document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{momentType=b.dataset.type;momentPage=1;renderMoments();}));
 $('moment-reset').addEventListener('click',()=>{momentYear='all';momentMonth='all';calendarYear=momentYears[0]||String(new Date().getFullYear());momentType='all';momentPage=1;renderMoments();play('project');dateTrigger.focus();});
 $('moment-list').addEventListener('click',e=>{const expand=e.target.closest('[data-expand]');if(expand){const more=$('more-'+expand.dataset.expand),opening=more.hidden;more.hidden=!opening;expand.setAttribute('aria-expanded',String(opening));expand.querySelector('span').textContent=opening?'收起正文':'阅读全文';}const photo=e.target.closest('[data-photo]');if(photo){const m=moments.find(m=>m.id===photo.dataset.photo),index=Number(photo.dataset.photoIndex);openImage(m.photos[index].src,m.date.slice(0,10)+' 的日常 · '+(index+1)+' / '+m.photos.length,m.url);}});
 function openImage(src,title,url){$('dialog-image').src=src;$('dialog-image').alt=title;$('image-title').textContent=title;$('dialog-link').href=safeUrl(new URL(url,location.href).href);$('image-dialog').showModal();actor.sync();}
 $('projection-thumb').addEventListener('click',()=>{const c=comics[projection];if(c)openImage(c.image,c.title,c.url);});$('open-projection').addEventListener('click',()=>{const c=comics[projection];if(c)openImage(c.image,c.title,c.url);});$('close-image').addEventListener('click',()=>$('image-dialog').close());$('image-dialog').addEventListener('click',e=>{if(e.target===$('image-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});$('image-dialog').addEventListener('close',()=>actor.sync());

renderMoments();chooseProjection(0,false);
window.momentsArchive={render:renderMoments,moments};
document.dispatchEvent(new Event('moments:ready'));

let updating=false;
async function refresh(){
 if(updating)return;updating=true;$('moment-refresh').disabled=true;$('moment-sync').dataset.state='loading';const started=Date.now();
 try{
  const current=await fetchAllMoments(),normalized=current.map(raw=>normalizeMoment(raw,cached.get(raw.id)));
  if(normalized.some(moment=>!moment))throw Error('动态数据格式不完整');
  for(const moment of normalized){const current=moments.find(value=>value.id===moment.id);if(current?.interactionUpdatedAt>=started)Object.assign(moment,{likes:current.likes,comments:current.comments,reactions:current.reactions,interactionUpdatedAt:current.interactionUpdatedAt});}
  const focused=document.activeElement?.dataset.calendarMonth;
  moments.splice(0,moments.length,...normalized.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)));
  syncYears();
  if(momentYear!=='all'&&!momentYears.includes(momentYear)){momentYear='all';momentMonth='all';}
  if(momentMonth!=='all'&&!moments.some(moment=>moment.date.startsWith(momentMonth))){momentMonth='all';}
  const scope=moments.filter(moment=>(momentYear==='all'||moment.date.startsWith(momentYear))&&(momentMonth==='all'||moment.date.startsWith(momentMonth)));
  if(!scope.some(momentMatchesType))momentType='all';
  $('moments-total').textContent=`${moments.length} 条动态`;renderMoments();$('moment-sync').hidden=true;$('moment-sync').dataset.state='ready';
  if(focused&&calendar.matches(':popover-open'))(calendar.querySelector(`[data-calendar-month="${focused}"]:not(:disabled)`)||$('calendar-year')).focus({preventScroll:true});
 }catch{
  $('moment-sync-message').textContent='暂时无法更新，已保留最近的动态存档。';$('moment-sync').hidden=false;$('moment-sync').dataset.state='error';
 }finally{updating=false;$('moment-refresh').disabled=false;}
}
$('moment-refresh').addEventListener('click',refresh);
refresh();
