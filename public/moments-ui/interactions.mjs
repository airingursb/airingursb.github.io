import {esc,EMOJIS} from './core.mjs';

const list=document.getElementById('moment-list');
const drafts=new Map(),conversations=new Map(),pending=new Set(),viewed=new Set();
const production=['ursb.me','www.ursb.me','airingursb.github.io'].includes(location.hostname);
const track=(name,data={})=>window.siteAnalytics?.track(name,{surface:'moments',...data});
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const find=id=>window.MOMENTS_DATA.moments.find(moment=>moment.id===id);
const row=id=>[...list.querySelectorAll('[data-moment]')].find(element=>element.dataset.moment===id);
const formDraft=form=>Object.fromEntries(['nickname','email','content'].map(name=>[name,form.elements.namedItem(name).value]));
async function api(id,action,body){
 const response=await fetch(`https://chat.ursb.me/api/moments/${encodeURIComponent(id)}/${action}`,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Error(data.message||'请求未完成，请稍后重试。');return data;
}
function commentsHtml(comments){
 const children=new Map(),indexed=new Set();
 function indexComment(comment,parent=''){
  if(indexed.has(comment.id))return;indexed.add(comment.id);
  const key=comment.parentId||comment.parent_id||parent;
  if(!children.has(key))children.set(key,[]);children.get(key).push(comment);
  for(const reply of comment.replies||[])indexComment(reply,comment.id);
 }
 comments.forEach(comment=>indexComment(comment));
 const seen=new Set();
 function branch(comment,depth){
  if(seen.has(comment.id))return '';seen.add(comment.id);
  const date=String(comment.created_at||'').slice(0,10);
  return `<article class="moment-comment" style="--depth:${Math.min(4,depth)}"><strong>${esc(comment.nickname||comment.name||'匿名')}</strong><time>${esc(date)}</time><p>${esc(comment.content)}</p></article>`+(children.get(comment.id)||[]).map(child=>branch(child,depth+1)).join('');
 }
 return (children.get('')||[]).map(comment=>branch(comment,0)).join('')||'<p>还没有评论，来聊两句。</p>';
}
function updateRow(id){
 const element=row(id),moment=find(id);if(!element||!moment)return;
 const likes=read('moment_likes',[]),reactions=read('moment_reactions',{}),myReactions=reactions[id]||[];
 element.querySelector('[data-action=like]').setAttribute('aria-pressed',String(likes.includes(id)));
 element.querySelector('.like-count').textContent=moment.likes||0;
 element.querySelector('.comment-count').textContent=moment.comments||0;
 element.querySelectorAll('[data-action=react]').forEach(button=>button.setAttribute('aria-pressed',String(myReactions.includes(button.dataset.emoji))));
 element.querySelector('.moment-reactions').innerHTML=Object.entries(moment.reactions||{}).filter(([emoji,count])=>EMOJIS.includes(emoji)&&Number(count)>0).map(([emoji,count])=>`<button type="button" data-action="react" data-emoji="${emoji}" aria-label="用${emoji}回应" aria-pressed="${myReactions.includes(emoji)}">${emoji} <span>${Number(count)}</span></button>`).join('');
 for(const button of element.querySelectorAll('[data-action]'))if(pending.has(id+':'+button.dataset.action))button.disabled=true;
 const conversation=conversations.get(id);
 if(conversation){element.querySelector('.moment-conversation').hidden=!conversation.open;element.querySelector('[data-action=comments]').setAttribute('aria-expanded',String(conversation.open));element.querySelector('.moment-comments').innerHTML=conversation.html||'';}
 const draft=drafts.get(id),form=element.querySelector('form');
 if(draft)for(const name of ['nickname','email','content'])form.elements.namedItem(name).value=draft[name]||'';
 if(pending.has(id+':submit')){form.querySelector('button[type=submit]').disabled=true;form.querySelector('button[type=submit]').textContent='发送中…';}
}
async function loadComments(id){
 const conversation=conversations.get(id);if(!conversation)return;
 conversation.html='<p role="status">正在读取评论…</p>';updateRow(id);
 try{const data=await api(id,'comments');conversation.html=commentsHtml(data.comments||[]);conversation.loaded=true;}
 catch{conversation.html='<p role="status">评论暂时无法读取。</p><button type="button" data-action="retry-comments">重试</button>';conversation.loaded=false;}
 updateRow(id);
}
list.addEventListener('input',event=>{const form=event.target.closest('.moment-comment-form');if(form)drafts.set(form.dataset.momentId,formDraft(form));});
list.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]'),element=button?.closest('[data-moment]');if(!button||!element||button.disabled)return;
 const id=element.dataset.moment,moment=find(id),action=button.dataset.action,status=element.querySelector('.moment-action-status');
 if(action==='comments'){
  const conversation=conversations.get(id)||{open:false,loaded:false,html:''};conversation.open=!conversation.open;conversations.set(id,conversation);updateRow(id);
  track('moment-comments-toggle',{open:conversation.open});if(conversation.open&&!conversation.loaded)await loadComments(id);return;
 }
 if(action==='retry-comments'){await loadComments(id);return;}
 if(!['like','react'].includes(action)||pending.has(id+':'+action))return;
 pending.add(id+':'+action);button.disabled=true;status.textContent='';
 const previousLikes=moment.likes,previousReactions={...moment.reactions};
 const likes=read('moment_likes',[]),wasLiked=likes.includes(id);
 if(action==='like'){
  moment.likes=Math.max(0,(moment.likes||0)+(wasLiked?-1:1));save('moment_likes',wasLiked?likes.filter(value=>value!==id):[...likes,id]);updateRow(id);
 }
 try{
  const data=await api(id,action,action==='react'?{emoji:button.dataset.emoji}:{});
  if(action==='like'){moment.likes=data.count;const current=read('moment_likes',[]).filter(value=>value!==id);if(data.liked)current.push(id);save('moment_likes',current);}
  else{moment.reactions=data.reactions;const current=read('moment_reactions',{}),mine=(current[id]||[]).filter(value=>value!==button.dataset.emoji);if(data.reacted)mine.push(button.dataset.emoji);current[id]=mine;save('moment_reactions',current);}
  moment.interactionUpdatedAt=Date.now();track('moment-'+action,{outcome:'success'});
 }catch(error){
  moment.likes=previousLikes;moment.reactions=previousReactions;
  if(action==='like'){const current=read('moment_likes',[]).filter(value=>value!==id);if(wasLiked)current.push(id);save('moment_likes',current);}
  const current=row(id);if(current)current.querySelector('.moment-action-status').textContent=error.message;track('moment-'+action,{outcome:'error'});
 }finally{pending.delete(id+':'+action);const current=row(id);current?.querySelectorAll('[data-action="'+action+'"]').forEach(control=>control.disabled=false);updateRow(id);}
});
list.addEventListener('submit',async event=>{
 const form=event.target.closest('.moment-comment-form');if(!form)return;event.preventDefault();
 const id=form.dataset.momentId;if(pending.has(id+':submit'))return;
 const draft=formDraft(form),payload={nickname:draft.nickname.trim(),email:draft.email.trim(),content:draft.content.trim()};if(!payload.nickname||!payload.content)return;
 drafts.set(id,draft);pending.add(id+':submit');const button=form.querySelector('button[type=submit]');button.disabled=true;button.textContent='发送中…';form.querySelector('.comment-status').textContent='';track('moment-comment-submit',{outcome:'start'});
 try{
  await api(id,'comments',payload);const moment=find(id);moment.comments=(moment.comments||0)+1;moment.interactionUpdatedAt=Date.now();
  const current=drafts.get(id)||draft;drafts.set(id,{...current,content:current.content===draft.content?'':current.content});
  await loadComments(id);const currentForm=row(id)?.querySelector('form');if(currentForm)currentForm.querySelector('.comment-status').textContent='评论已发送。';track('moment-comment-submit',{outcome:'success'});
 }catch(error){const current=row(id)?.querySelector('form');if(current)current.querySelector('.comment-status').textContent=error.message;track('moment-comment-submit',{outcome:'error'});}
 finally{pending.delete(id+':submit');updateRow(id);const current=row(id)?.querySelector('form');if(current){current.querySelector('button[type=submit]').disabled=false;current.querySelector('button[type=submit]').textContent='发送评论';}}
});
const observer=new IntersectionObserver(entries=>{
 for(const entry of entries){if(!entry.isIntersecting)continue;const id=entry.target.dataset.moment;if(!production||viewed.has(id))continue;viewed.add(id);api(id,'view',{}).catch(()=>{});observer.unobserve(entry.target);}
},{threshold:.2});
function restore(){for(const element of list.querySelectorAll('[data-moment]')){updateRow(element.dataset.moment);if(production&&!viewed.has(element.dataset.moment))observer.observe(element);}}
document.addEventListener('moments:before-render',()=>{for(const form of list.querySelectorAll('form'))drafts.set(form.dataset.momentId,formDraft(form));observer.disconnect();});
document.addEventListener('moments:rendered',restore);document.addEventListener('moments:ready',restore);restore();
document.addEventListener('click',event=>{
 const control=event.target.closest('button,a');if(!control||!control.closest('.moments-page'))return;
 if(control.matches('[data-calendar-month]'))track('moment-time-filter',{scope:'month',month:control.dataset.calendarMonth});
 else if(control.id==='calendar-select-year')track('moment-time-filter',{scope:'year',year:document.getElementById('calendar-year').value});
 else if(control.id==='calendar-select-all'||control.id==='moment-reset')track('moment-time-filter',{scope:'all',reset:control.id==='moment-reset'});
 else if(control.matches('[data-type]'))track('moment-type-filter',{type:control.dataset.type});
 else if(control.closest('#moments-pager')&&control.dataset.page)track('moment-page',{page:Number(control.dataset.page)});
 else if(control.matches('[data-photo]'))track('moment-image-open',{index:Number(control.dataset.photoIndex)});
 else if(control.matches('[data-expand]'))track('moment-text-toggle',{expanded:control.getAttribute('aria-expanded')!=='true'});
 else if(control.matches('[data-play],#pause-moments'))track('moment-actor',{action:control.id==='pause-moments'?'pause-toggle':'replay'});
},true);
