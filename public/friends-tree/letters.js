(() => {
'use strict';
const root=document.querySelector('.forest-mail'),data=window.FRIEND_LETTERS_DATA;
if(!root||!data)return;
data.avatars=window.FRIEND_AVATARS;
data.posts=data.posts.map(post=>({...post,days:Math.max(0,(Date.now()-Date.parse(post.published))/86400000)}));
const avatars=new Map(data.avatars.map(a=>[a.id,a]));
const postById=new Map(data.posts.map(p=>[p.id,p]));
const storeKey='ursb:friend-letters:saved:v1';
const state={design:'letters',view:'recent',days:30,query:'',page:1,size:6,selected:null,saved:[]};
try{const stored=JSON.parse(localStorage.getItem(storeKey)||'[]');if(Array.isArray(stored))state.saved=[...new Set(stored.filter(id=>postById.has(id)))];}catch{}
const icons={
mail:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3zM3 6l9 7 9-7"/></svg>',
save:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z"/></svg>',
check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
pen:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4-1L20 7l-3-3L5 16zM14 7l3 3M4 20h12"/></svg>'
};
const $=id=>root.querySelector('#'+id);
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function safeUrl(value){try{const url=new URL(value);return /^https?:$/.test(url.protocol)?url.href:null;}catch{return null;}}
function link(text,url,cls){const href=safeUrl(url);const a=el(href?'a':'span',cls,text);if(href){a.href=href;a.target='_blank';a.rel='noopener noreferrer';}return a;}
function domain(url){try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '小站地址';}}
function portrait(id,label){const a=avatars.get(id)||data.avatars[0];const p=el('span','portrait');p.style.setProperty('--portrait-scale',a.frame.scale);p.style.setProperty('--portrait-x',a.frame.x*100+'%');p.style.setProperty('--portrait-y',a.frame.y*100+'%');const img=new Image(192,192);img.src=a.src;img.alt=label+'的默认动物头像';img.loading='lazy';img.decoding='async';p.append(img);return p;}
function parts(post){const d=post.published.slice(0,10).split('-');return {year:d[0],month:d[1],day:d[2],full:d.join('.')};}
function textExcerpt(post){const decoder=document.createElement('textarea');decoder.innerHTML=String(post.excerpt).replace(/<[^>]*(?:>|$)/g,' ');const text=decoder.value.replace(/<[^>]*(?:>|$)/g,' ').replace(/\s+/g,' ').trim();return /rich-text content; please visit/i.test(text)?'':text.slice(0,180);}
function saveButton(id){const b=el('button','save-button');b.type='button';b.dataset.save=id;updateSaveButton(b);return b;}
function updateSaveButton(b){const saved=state.saved.includes(b.dataset.save);b.setAttribute('aria-pressed',String(saved));b.setAttribute('aria-label',(saved?'取消收藏：':'收藏文章：')+postById.get(b.dataset.save).title);b.innerHTML=saved?icons.check:icons.save;b.append(document.createTextNode(saved?'已收藏':'收进手帐'));}
function announce(text){$('letters-status').textContent=text;}
function letterRow(post){
const row=el('article','option-row');row.dataset.post=post.id;
const d=parts(post),author=el('div','option-author'),info=el('div','option-author-info');
info.append(link(post.friend,post.url),el('span','',d.full+' · '+domain(post.url)));
const time=el('time','',d.month+'.'+d.day);time.dateTime=post.published;author.append(portrait(post.avatarId,post.friend),info,time);
const title=el('h3','option-title');title.append(link(post.title,post.article));const main=el('div','option-main');main.append(title);
if(post.recommendation){const note=el('aside','option-note'),label=el('div','option-note-label');label.innerHTML=icons.pen;label.append(document.createTextNode('读前便笺 · 根据正文片段'));note.append(label,el('p','',post.recommendation));main.append(note);}
else if(textExcerpt(post)){main.append(el('p','option-excerpt',textExcerpt(post)));}
const actions=el('div','option-actions');actions.append(saveButton(post.id),link('读这封信 ↗',post.article));
row.append(author,main,actions);
return row;
}
function filteredPosts(){
let rows=data.posts.filter(p=>state.view==='old'?p.days>365:state.view==='saved'?state.saved.includes(p.id):state.days==='all'||p.days<=state.days);
if(state.query){const q=state.query.toLocaleLowerCase();rows=rows.filter(p=>(p.title+' '+p.friend+' '+p.tags.join(' ')).toLocaleLowerCase().includes(q));}
return rows;
}
function renderLetters(){
const rows=filteredPosts();const pages=Math.max(1,Math.ceil(rows.length/state.size));state.page=Math.min(state.page,pages);
const label=state.view==='old'?'原发表时间已超过一年的旧信':state.view==='saved'?'本机收藏':state.days==='all'?'采集的订阅文章':state.days+' 天内的来信';
$('results-note').textContent=label+' · '+rows.length+' 篇';
const list=$('letter-list');list.replaceChildren();
rows.slice((state.page-1)*state.size,state.page*state.size).forEach(p=>list.append(letterRow(p)));
if(!rows.length){const empty=el('div','empty-state');empty.append(el('h3','',state.view==='saved'&&!state.query?'手帐，等一枚新的印章。':'暂时没有找到这封信。'),el('p','',state.view==='saved'&&!state.query?'看到喜欢的文章，点「收进手帐」就能留在这里。':'试试另一位朋友，或放宽发表时间。'));const reset=el('button','',state.view==='saved'?'去看最近来信':'查看全部来信');reset.type='button';reset.dataset.reset='true';empty.append(reset);list.append(empty);}
$('page-status').textContent=rows.length?state.page+' / '+pages:'0 / 0';$('prev-page').disabled=state.page===1||!rows.length;$('next-page').disabled=state.page>=pages||!rows.length;
root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
root.querySelectorAll('[data-days]').forEach(b=>{b.setAttribute('aria-pressed',String(String(state.days)===b.dataset.days));b.disabled=state.view!=='recent';});
}
function renderPassport(){
$('saved-tab-count').textContent=state.saved.length;$('passport-count').textContent=state.saved.length+' 枚';
const stamps=$('passport-stamps');stamps.replaceChildren();
const friends=[...new Map(state.saved.map(id=>{const p=postById.get(id);return [p.friend,p];})).values()];
friends.slice(0,6).forEach(p=>{const image=portrait(p.avatarId,p.friend);image.title=p.friend;stamps.append(image);});
if(!friends.length)for(let i=0;i<3;i++){const slot=el('span','empty-stamp');slot.innerHTML=icons.pen;stamps.append(slot);}
$('passport-note').textContent=state.saved.length?'已经收下 '+state.saved.length+' 篇文字。下次来，还找得到。':'把喜欢的文字收进手帐，下次还记得回来的路。';
$('clear-saved').hidden=!state.saved.length;
}
function toggleSave(id){if(!postById.has(id))return;const wasSaved=state.saved.includes(id);state.saved=wasSaved?state.saved.filter(x=>x!==id):[id,...state.saved];try{localStorage.setItem(storeKey,JSON.stringify(state.saved));}catch{}renderPassport();root.querySelectorAll('[data-save]').forEach(updateSaveButton);if(state.view==='saved'){renderLetters();root.querySelector('[data-view="saved"]').focus();}announce((wasSaved?'已从手帐移除：':'已收进手帐：')+postById.get(id).title);}
function openWalk(){
const recent=data.posts.filter(p=>p.days<=30);const old=data.posts.filter(p=>p.days>365);
const a=recent[Math.floor(Math.random()*recent.length)],b=old[Math.floor(Math.random()*old.length)],others=data.posts.filter(p=>p.id!==a?.id&&p.id!==b?.id&&!state.saved.includes(p.id));const c=others[Math.floor(Math.random()*others.length)];const stops=[a,b,c].filter(Boolean);
$('walk-list').replaceChildren();stops.forEach((p,i)=>{const stop=el('article','walk-stop');stop.append(el('span','stop-number','0'+(i+1)));const body=el('div');body.append(el('p','eyebrow',['最近的一封信','从旧信里重逢','去另一位朋友家'][i]));const title=el('h3');title.append(link(p.title,p.article));body.append(title,el('p','',p.friend+' · '+parts(p).full),saveButton(p.id));stop.append(body);$('walk-list').append(stop);});$('walk-dialog').showModal();
}
root.addEventListener('click',event=>{
const save=event.target.closest('[data-save]');if(save)toggleSave(save.dataset.save);
const close=event.target.closest('[data-close]');if(close)$(close.dataset.close).close();
const reset=event.target.closest('[data-reset]');if(reset){state.view='recent';state.days='all';state.query='';state.page=1;$('letter-search').value='';renderLetters();}
});
root.querySelectorAll('[data-days]').forEach(b=>b.addEventListener('click',()=>{state.days=b.dataset.days==='all'?'all':Number(b.dataset.days);state.page=1;renderLetters();}));
root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;state.page=1;renderLetters();}));
$('letter-search').addEventListener('input',event=>{state.query=event.target.value.trim();state.page=1;renderLetters();});
function pageChange(delta){state.page+=delta;renderLetters();root.querySelector('.inbox-tabs').scrollIntoView({block:'start'});const heading=$('letters-title');heading.tabIndex=-1;heading.focus({preventScroll:true});}
$('prev-page').addEventListener('click',()=>pageChange(-1));$('next-page').addEventListener('click',()=>pageChange(1));
$('walk-open').addEventListener('click',openWalk);
$('clear-saved').addEventListener('click',()=>{state.saved=[];try{localStorage.removeItem(storeKey);}catch{}renderPassport();root.querySelectorAll('[data-save]').forEach(updateSaveButton);if(state.view==='saved')renderLetters();announce('本机收藏已清空。');});
const track=(name,detail={})=>window.friendTreeAnalytics?.track(name,detail);
root.addEventListener('click',event=>{
const target=event.target.closest('button,a');if(!target)return;
if(target.dataset.save)track('friend-letter-save',{saved:state.saved.includes(target.dataset.save)});
else if(target.dataset.view)track('friend-letter-filter',{view:target.dataset.view});
else if(target.dataset.days)track('friend-letter-period',{days:target.dataset.days});
else if(target.matches('.option-title a,.option-actions a,.walk-stop h3 a,#old-feature-title'))track('friend-letter-open',{source:target.closest('.walk-stop')?'walk':'list'});
else if(target.id==='walk-open')track('friend-letter-walk');
else if(target.id==='next-page'||target.id==='prev-page')track('friend-letter-page',{page:state.page});
});
const recentCount=data.posts.filter(p=>p.days<=30).length;
root.querySelector('.mailbox-message p').textContent=recentCount+' 位朋友在近 30 天写了新文章。';
root.querySelector('[data-view=recent] .tab-number').textContent=recentCount;
renderLetters();renderPassport();
})();
