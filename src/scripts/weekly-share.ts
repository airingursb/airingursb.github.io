import { trackEvent } from '../lounge/umami.ts';

export function initWeeklyShare() {
 const dialog = document.querySelector<HTMLDialogElement>('#issue-share');
 if (!dialog) return;
 const input = dialog.querySelector<HTMLInputElement>('#share-url')!;
 const copyButton = dialog.querySelector<HTMLButtonElement>('#share-copy')!;
 const copyLabel = copyButton.querySelector('span')!;
 const status = dialog.querySelector<HTMLElement>('#share-status')!;
 const nativeButton = dialog.querySelector<HTMLButtonElement>('#share-native')!;
 const zh = !document.documentElement.lang.startsWith('en');
 const context = {issue: dialog.dataset.issue!, lang: zh ? 'zh' : 'en', surface:'weekly-issue'};
 let opener: HTMLElement | null = null;
 document.querySelectorAll<HTMLElement>('.share-trigger').forEach(button => {
  button.addEventListener('click', () => {
   opener = button;
   copyButton.removeAttribute('data-copied');
   copyLabel.textContent = zh ? '复制链接' : 'Copy link';
   status.textContent = zh ? '可保存封面图片，发给一起阅读的朋友。' : 'Save the cover and send it to a friend who reads with you.';
   document.body.classList.add('sharing-issue');
   dialog.showModal();
   dialog.querySelector<HTMLButtonElement>('.share-close')!.focus();
  });
 });
 dialog.querySelector('.share-close')!.addEventListener('click', () => dialog.close());
 dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if(event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
 });
 dialog.addEventListener('keydown', event => {
  if(event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll<HTMLElement>('button:not([hidden]), a[href], input')];
  const target = event.shiftKey && document.activeElement === controls[0] ? controls.at(-1) : !event.shiftKey && document.activeElement === controls.at(-1) ? controls[0] : null;
  if(target) { event.preventDefault(); target.focus(); }
 });
 dialog.addEventListener('close', () => { document.body.classList.remove('sharing-issue'); opener?.focus(); });
 input.addEventListener('click', () => input.select());
 copyButton.addEventListener('click', async () => {
  let copied = false;
  try { if(navigator.clipboard?.writeText) { await navigator.clipboard.writeText(input.value); copied = true; } } catch { copied = false; }
  if(!copied) { input.focus(); input.select(); try { copied = document.execCommand('copy'); } catch { copied = false; } }
  trackEvent('weekly-share', {...context,action:'copy',result:copied?'success':'error'});
  copyButton.dataset.copied = String(copied);
  copyLabel.textContent = copied ? (zh?'已复制':'Copied') : (zh?'复制链接':'Copy link');
  status.textContent = copied ? (zh?'链接已复制。可以粘贴给朋友了。':'Link copied. Ready to send to a friend.') : (zh?'链接已选中，请长按或按 ⌘C / Ctrl+C 复制。':'The link is selected. Long-press or use ⌘C / Ctrl+C to copy.');
  if(copied) copyButton.focus();
 });
 nativeButton.hidden = typeof navigator.share !== 'function';
 nativeButton.addEventListener('click', async () => {
  try {
   await navigator.share({title:dialog.dataset.shareTitle,url:input.value});
   trackEvent('weekly-share', {...context,action:'native',result:'success'});
   status.textContent = zh?'已交给系统分享。':'Opened system sharing.';
  } catch(error) {
   const cancelled = error instanceof DOMException && error.name === 'AbortError';
   trackEvent('weekly-share', {...context,action:'native',result:cancelled?'cancelled':'error'});
   if(!cancelled) status.textContent = zh?'系统分享暂不可用，可以复制链接或保存封面。':'System sharing is unavailable. Copy the link or save the cover.';
  }
 });
}
