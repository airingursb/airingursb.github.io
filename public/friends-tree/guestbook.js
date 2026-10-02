(() => {
  'use strict';
  const root=document.getElementById('guestbook');
  if(!root)return;
  const $=id=>root.querySelector('#'+id),api='https://chat.ursb.me';
  const form=$('gb-form'),draft=$('gb-draft'),error=$('gb-error');
  const confirm=document.createElement('button');
  confirm.type='button';confirm.className='gb-button gb-submit-confirm';confirm.id='gb-submit-confirm';confirm.hidden=true;
  $('gb-edit').before(confirm);
  let preview=null,parentId=null,page=0,roots=[],sending=false;
  const url=value=>{try{const parsed=new URL(value);return ['https:','http:'].includes(parsed.protocol)?parsed.href:'';}catch{return '';}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const buildComment=(comment,depth=0)=>{
    const name=esc(comment.nickname||'访客'),website=url(comment.website),image=url(comment.avatar),date=new Date(comment.created_at);
    const dateText=Number.isFinite(date.valueOf())?date.toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}):'';
    const replies=depth<8?comment.replies:[],body='live-comment-'+comment.id,long=String(comment.content).length>150;
    return `<article class="gb-comment"><div class="gb-comment-head"><div class="gb-comment-person">${image?`<img class="gb-comment-avatar" src="${esc(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}${website?`<a class="gb-comment-name" href="${esc(website)}" target="_blank" rel="noopener noreferrer">${name}</a>`:`<span class="gb-comment-name">${name}</span>`}</div><time datetime="${dateText}">${dateText}</time></div><p class="gb-comment-body${long?' gb-clamped':''}" id="${body}">${esc(comment.content)}</p><div class="gb-comment-actions">${long?`<button type="button" class="gb-quiet" data-live-fulltext="${body}" aria-expanded="false">展开全文</button>`:''}<button type="button" class="gb-quiet" data-gb-reply="${name}" data-comment-id="${esc(comment.id)}">回复 ${name}</button></div>${replies.length?`<details class="gb-reply-details"><summary>查看 ${replies.length} 条回复</summary><div class="gb-replies">${replies.map(reply=>buildComment(reply,depth+1)).join('')}</div></details>`:''}</article>`;
  };
  function render(){
    const count=Math.max(1,Math.ceil(roots.length/5));page=Math.min(page,count-1);
    $('gb-comment-pages').innerHTML=roots.length?roots.slice(page*5,page*5+5).map(comment=>buildComment(comment)).join(''):'<p class="gb-empty">还没有留言。来留下一句问候吧。</p>';
    $('gb-comments-prev').disabled=page===0;$('gb-comments-next').disabled=page>=count-1;
    $('gb-comments-status').textContent=`第 ${page+1} 页 / 共 ${count} 页`;
  }
  async function load(){
    try{
      const response=await fetch(api+'/api/comments?post_slug=guestbook');if(!response.ok)throw Error('read');
      const payload=await response.json(),comments=Array.isArray(payload.comments)?payload.comments:[];
      const map=new Map(comments.map(comment=>[String(comment.id),{...comment,replies:[]} ]));roots=[];
      for(const comment of map.values()){
        const parent=comment.parent_id&&map.get(String(comment.parent_id));
        if(parent&&parent!==comment)parent.replies.push(comment);else roots.push(comment);
      }
      roots.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
      root.querySelector('.gb-thread-heading span').textContent=comments.length+' 条留言（含回复）';render();
    }catch{
      $('gb-comment-pages').innerHTML='<p class="gb-empty">留言簿暂时没有打开，请稍后重试。<button class="gb-quiet" type="button" id="gb-retry">重新读取</button></p>';
      $('gb-retry').addEventListener('click',load);root.querySelector('.gb-thread-heading span').textContent='暂未读取';
    }
  }
  window.addEventListener('friend-draft-preview',event=>{
    preview={...event.detail,parent_id:event.detail.mode==='message'?parentId:null};
    confirm.hidden=false;confirm.disabled=false;confirm.textContent=preview.mode==='site'?'提交友链申请':'发布留言';
  });
  root.addEventListener('click',event=>{
    const reply=event.target.closest('[data-comment-id]');
    if(reply)parentId=reply.dataset.commentId;
    const full=event.target.closest('[data-live-fulltext]');
    if(full){const expanded=full.getAttribute('aria-expanded')==='true';$(full.dataset.liveFulltext).classList.toggle('gb-clamped',expanded);full.setAttribute('aria-expanded',String(!expanded));full.textContent=expanded?'展开全文':'收起';}
  },true);
  $('gb-cancel-reply').addEventListener('click',()=>{parentId=null;});
  $('gb-clear').addEventListener('click',()=>{parentId=null;preview=null;confirm.hidden=true;});
  form.querySelectorAll('[name="gb-mode"]').forEach(input=>input.addEventListener('change',()=>{parentId=null;}));
  form.addEventListener('input',()=>{confirm.hidden=true;preview=null;});
  confirm.addEventListener('click',async()=>{
    if(!preview||sending)return;
    const activePreview=preview,application=activePreview.mode==='site';
    const email=$('gb-email').value.trim(),notify=$('gb-notify').checked;
    if(!$('gb-email').checkValidity()||(notify&&!email)){error.textContent='需要邮件通知时，请填写有效邮箱。';$('gb-email').focus();return;}
    let content=preview.message;
    if(preview.mode==='site'){
      if(preview.avatar?.kind==='upload'){error.textContent='登记请填写头像图片地址，或选择一个森林头像。';return;}
      const avatar=preview.avatar?.src?new URL(preview.avatar.src,location.origin).href:'';
      content=`友链申请（待人工审核上树）\n名称：${preview.name}\n地址：${preview.url}\n头像：${avatar}\n简介：${preview.message}`;
    }
    if(content.length>2000){error.textContent='资料过长，请缩短介绍或头像地址后重新预览。';return;}
    const submitted={post_slug:'guestbook',nickname:preview.name,email,website:preview.url||undefined,content,parent_id:preview.parent_id||null,notify_replies:notify};
    sending=true;confirm.disabled=true;confirm.textContent='正在提交……';error.textContent='';
    try{
      const response=await fetch(api+'/api/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(submitted)});
      const result=await response.json();if(!response.ok)throw Error(result.message||'提交失败，请稍后再试。');
      draft.querySelector('.gb-draft-status').textContent=application?'已提交 · 等待审核':'已提交';
      $('gb-preview-note').textContent=application?'申请已收到。Airing 人工审核通过后才会挂铃，树上不会立即增加。':result.status==='approved'?'留言已发布。':'留言已收到，审核通过后展示。';
      confirm.hidden=true;preview=null;parentId=null;
      try{localStorage.removeItem('ursb:friend-tree:guestbook-draft:v1');}catch{}
      await load();
      window.umami?.track('friend-registration-submit',{kind:application?'application':'message'});
    }catch(cause){error.textContent=cause.message||'提交失败，请稍后再试。';confirm.textContent='重试提交';}
    finally{sending=false;confirm.disabled=false;}
  });
  const changePage=delta=>{page=Math.max(0,Math.min(Math.ceil(roots.length/5)-1,page+delta));render();$('gb-thread-title').focus({preventScroll:true});$('gb-thread-title').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});};
  $('gb-comments-prev').addEventListener('click',()=>changePage(-1));$('gb-comments-next').addEventListener('click',()=>changePage(1));
  document.getElementById('friend-visit').addEventListener('click',event=>window.umami?.track('friend-link',{url:event.currentTarget.href}));
  void load();
})();
