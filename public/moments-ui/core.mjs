 export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 export const safeUrl=v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}};
 export function linkify(text){
  const pattern=/(?:https?:\/\/|www\.)[^\s<>"，。！？；：、（）【】《》「」『』]+/g;
  let html='',cursor=0;
  for(const match of text.matchAll(pattern)){
   let url=match[0];
   url=url.replace(/[.,!?;:]+$/,'');
   for(const [open,close] of [['(',')'],['[',']'],['{','}']]){
    while(url.endsWith(close)&&url.split(close).length>url.split(open).length)url=url.slice(0,-1);
   }
   const href=safeUrl(url.startsWith('www.')?'https://'+url:url);
   html+=esc(text.slice(cursor,match.index));
   const characters=[...url],tail=characters.slice(-8).join(''),start=characters.slice(0,-8).join('');
   html+=href?`<a class="moment-inline-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(start)}<span class="moment-url-tail">${esc(tail)}</span></a>`:esc(url);
   cursor=match.index+url.length;
  }
  return (html+esc(text.slice(cursor))).replaceAll('\n','<br>');
 }
 export function momentProse(moment){
  const blocks=moment.content.trim().split(/\n\s*\n/).filter(Boolean);
  if(!blocks.length)return {html:'',long:false};
  const long=blocks.length>3||moment.content.length>360||moment.content.split('\n').length>8;
  const lead=blocks.length>1&&blocks[0].length<=120&&!blocks[0].includes('\n')&&!/^(https?:\/\/|www\.)/.test(blocks[0]);
  const paragraph=(block,index)=>`<p${lead&&index===0?' class="moment-lead"':blocks.length===1&&block.length<120&&!/https?:\/\/|www\./.test(block)?' class="moment-note"':''}>${linkify(block)}</p>`;
  const visible=long?blocks.slice(0,2):blocks;
  const more=long?blocks.slice(2):[];
  const expandable=more.length>0;
  return {long:expandable,html:visible.map(paragraph).join('')+(expandable?`<div class="moment-more" id="more-${esc(moment.id)}" hidden>${more.map((block,index)=>paragraph(block,index+2)).join('')}</div>`:'')};
 }
export const momentEntryHtml=m=>{
   const prose=momentProse(m),long=prose.long,date=m.date.slice(0,10);
   const photos=m.photos||[],previews=m.previews||[];
   const gallery=photos.length?`<div class="moment-photos${photos.length===1?' single':photos.length===3?' triple':' multi'}">${photos.map((photo,index)=>`<button class="moment-photo" data-photo="${esc(m.id)}" data-photo-index="${index}" aria-label="放大 ${esc(date)} 的第 ${index+1} 张照片"><img src="${esc(photo.src)}" alt="${esc(date)} 的动态配图 ${index+1}" width="${photo.width||400}" height="${photo.height||300}" loading="lazy" decoding="async"></button>`).join('')}</div>`:'';
   const links=previews.map(preview=>{
    const url=safeUrl(preview.url);if(!url)return '';
    return `<a class="moment-link-preview${preview.image?' with-cover':''}" href="${esc(url)}" target="_blank" rel="noopener">${preview.image?`<img class="moment-link-cover" src="${esc(preview.image)}" alt="${esc(preview.title||'相关链接')}的封面" width="${preview.imageWidth||400}" height="${preview.imageHeight||300}" loading="lazy" decoding="async">`:''}<div class="moment-link-copy"><strong>${esc(preview.title||'相关链接')} ↗</strong>${preview.description?`<p>${esc(preview.description)}</p>`:''}<span>${esc(new URL(url).hostname)}</span></div></a>`;
   }).join('');
   return `<article class="moment-entry moment-item" data-moment="${esc(m.id)}" data-moment-id="${esc(m.id)}"><time class="moment-date" datetime="${esc(date)}"><strong>${esc(date.slice(8,10))}</strong><span>${esc(date.slice(0,7))}</span></time><div class="moment-content"><div class="moment-text" id="text-${esc(m.id)}">${prose.html}</div>${long?`<button class="moment-expand" data-expand="${esc(m.id)}" aria-expanded="false" aria-controls="more-${esc(m.id)}"><span>阅读全文</span><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>`:''}${links}${gallery}${momentActionsHtml(m)}<div class="moment-foot"><a href="${esc(safeUrl(m.url))}" target="_blank" rel="noopener">原动态 <span aria-hidden="true">↗</span></a></div></div></article>`;
  };

export function renderTimeline(shown,matches){
 const groups=new Map();shown.forEach(m=>{const key=m.date.slice(0,7);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);});
 const monthNames=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
 return [...groups].map(([key,items],index)=>`<section class="timeline-month" data-timeline-month="${key}" aria-labelledby="timeline-${key}"><header class="timeline-month-heading"><h3 id="timeline-${key}"><span class="timeline-year">${key.slice(0,4)}</span><span>${monthNames[Number(key.slice(5))-1]}</span></h3><span class="timeline-month-count">${matches.filter(m=>m.date.startsWith(key)).length} 则记录</span></header><div class="timeline-records${index===0?' timeline-leading':''}">${items.map(momentEntryHtml).join('')}</div></section>`).join('')||'<p class="empty">暂时没有动态。</p>';
}

export const EMOJIS=['👍','❤️','🔥','😄','🎉','🙏','😢','🤔'];
export function momentActionsHtml(moment){
 return `<div class="moment-actions"><button type="button" class="moment-like" data-action="like" aria-label="喜欢这条动态" aria-pressed="false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span class="like-count">${Number(moment.likes)||0}</span></button><button type="button" data-action="comments" aria-expanded="false" aria-controls="conversation-${esc(moment.id)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>评论</span><span class="comment-count">${Number(moment.comments)||0}</span></button><div class="moment-reactions"></div></div><p class="moment-action-status" role="status"></p><section class="moment-conversation" id="conversation-${esc(moment.id)}" hidden aria-label="评论与表情"><div class="moment-emoji-picker" role="group" aria-label="回应这条动态">${EMOJIS.map(emoji=>`<button type="button" data-action="react" data-emoji="${emoji}" aria-label="用${emoji}回应" aria-pressed="false">${emoji}</button>`).join('')}</div><div class="moment-comments" id="comments-${esc(moment.id)}"></div><form class="moment-comment-form" data-moment-id="${esc(moment.id)}"><div class="comment-fields"><label>昵称 <input name="nickname" required maxlength="50" autocomplete="nickname"></label><label>邮箱（选填）<input name="email" type="email" autocomplete="email"></label></div><label>留下你的想法 <textarea name="content" required maxlength="2000" rows="3"></textarea></label><button type="submit">发送评论</button><p class="comment-status" role="status"></p></form></section>`;
}

export function normalizeMoment(raw,cached){
 const publishedAt=String(raw.published_at||raw.publishedAt||'');
 if(typeof raw.id!=='string'||!Number.isFinite(new Date(publishedAt).getTime()))return null;
 const photos=(Array.isArray(raw.images)?raw.images:[]).map((url,index)=>{
  const old=cached?.photos?.[index];
  return old?.original===url?{...old}:{src:safeUrl(url),original:safeUrl(url),width:640,height:480};
 }).filter(photo=>photo.src);
 const previews=(Array.isArray(raw.link_previews)?raw.link_previews:[]).map(preview=>{
  const old=cached?.previews?.find(p=>p.url===preview.url&&(p.originalImage||p.image)===preview.image);
  return {...preview,url:safeUrl(preview.url),originalImage:safeUrl(preview.image),image:old?.image||safeUrl(preview.image),imageWidth:old?.imageWidth||400,imageHeight:old?.imageHeight||300};
 }).filter(preview=>preview.url);
 return {id:raw.id,content:String(raw.content||''),publishedAt,date:new Date(publishedAt).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),photos,photo:photos[0]?.src||'',previews,url:raw.telegram_post_id?`https://t.me/${raw.telegram_post_id}`:'https://ursb.me/moments/',likes:Math.max(0,Number(raw.likes)||0),comments:Math.max(0,Number(raw.comments)||0),reactions:raw.reactions||{}};
}

export async function fetchAllMoments(fetcher=fetch){
 const page=async number=>{
  const response=await fetcher(`https://chat.ursb.me/api/moments?page=${number}&limit=40`,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('动态读取失败（'+response.status+'）');
  const data=await response.json();
  if(!Array.isArray(data.moments)||!Number.isInteger(data.total)||data.total<0)throw Error('动态数据格式不完整');
  return data;
 };
 const first=await page(1),pages=Math.ceil(first.total/40),all=[...first.moments];
 for(let start=2;start<=pages;start+=4){
  const batch=await Promise.all(Array.from({length:Math.min(4,pages-start+1)},(_,i)=>page(start+i)));
  batch.forEach(data=>all.push(...data.moments));
 }
 const unique=[...new Map(all.map(moment=>[moment.id,moment])).values()];
 if(unique.length<first.total)throw Error('动态未读取完整，请重试');
 return unique;
}
