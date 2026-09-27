import { trackEcho } from './analytics';
const dialog = document.querySelector<HTMLDialogElement>('[data-share-dialog]');
const en = document.documentElement.lang.startsWith('en');
const text = (zh: string, english: string) => en ? english : zh;
if (dialog) {
  const input = dialog.querySelector<HTMLInputElement>('#share-url')!;
  const status = dialog.querySelector<HTMLElement>('#share-status')!;
  const native = dialog.querySelector<HTMLButtonElement>('#share-native')!;
  const copy = dialog.querySelector<HTMLButtonElement>('#share-copy')!;
  const download = dialog.querySelector<HTMLAnchorElement>('.share-download')!;
  let opener: HTMLButtonElement | undefined;
  let number = '';
  let title = '';
  document.querySelectorAll<HTMLButtonElement>('[data-share-open]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      opener = button;
      number = button.dataset.shareIssue ?? '01';
      title = button.dataset.shareTitle ?? document.title;
      const url = new URL(button.dataset.sharePath ?? location.pathname, location.origin);
      if (url.pathname === location.pathname) url.hash = location.hash;
      input.value = url.href;
      const cover = `/echo/share/${number}-${en ? 'en' : 'zh'}.png`;
      dialog.querySelector<HTMLImageElement>('.share-preview img')!.src = cover;
      dialog.querySelector<HTMLElement>('.share-current-title')!.textContent = title;
      download.href = cover;
      download.download = `echo-${number}-${en ? 'en' : 'zh'}.png`;
      dialog.querySelector<HTMLAnchorElement>('#share-x')!.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url.href);
      dialog.querySelector<HTMLAnchorElement>('#share-threads')!.href = 'https://www.threads.net/intent/post?text=' + encodeURIComponent(title + ' ' + url.href);
      dialog.querySelector<HTMLElement>('#share-note')!.textContent = location.hostname.startsWith('100.') || ['localhost', '[::1]', '127.0.0.1'].includes(location.hostname)
        ? text('这是预览链接，接收方也需连接同一网络。封面图片可以直接分享。', 'This preview link requires access to the same network. The cover image can be shared anywhere.')
        : text('把这一期或读到的位置，分享给正在面对相似问题的朋友。', 'Send this issue, or your place in it, to someone facing a similar question.');
      status.textContent = text('保存封面，或者复制这一页的链接。', 'Save the cover or copy the link to this page.');
      copy.textContent = text('复制链接', 'Copy link');
      document.body.classList.add('sharing-issue');
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('.share-close')!.focus();
      trackEcho('share-open', { issue: number });
    });
  });
  dialog.querySelector('.share-close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('sharing-issue'); opener?.focus(); });
  input.addEventListener('click', () => input.select());
  copy.addEventListener('click', async () => {
    let copied = false;
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(input.value); copied = true; } } catch { copied = false; }
    if (!copied) {
      input.focus(); input.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; }
    }
    copy.textContent = copied ? text('已复制', 'Copied') : text('复制链接', 'Copy link');
    status.textContent = copied ? text('链接已复制，可以粘贴给朋友了。', 'Link copied. Ready to send to a friend.') : text('未能自动复制。链接已选中，请长按或按 ⌘C / Ctrl+C。', 'Could not copy automatically. The link is selected; long-press or use ⌘C / Ctrl+C.');
    if (copied) copy.focus();
    trackEcho('share-copy', { issue: number, result: copied ? 'success' : 'failed' });
  });
  native.hidden = typeof navigator.share !== 'function';
  native.addEventListener('click', async () => {
    try {
      await navigator.share({ title, url: input.value });
      status.textContent = text('已交给系统分享。', 'Handed over to system sharing.');
      trackEcho('share-native', { issue: number, result: 'success' });
    } catch (error) {
      const cancelled = error instanceof Error && error.name === 'AbortError';
      trackEcho('share-native', { issue: number, result: cancelled ? 'cancelled' : 'failed' });
      if (!cancelled) status.textContent = text('系统分享暂不可用，可以复制链接或保存封面。', 'System sharing is unavailable. Copy the link or save the cover.');
    }
  });
  download.addEventListener('click', () => trackEcho('share-download', { issue: number }));
  for (const method of ['x', 'threads']) dialog.querySelector('#share-' + method)?.addEventListener('click', () => trackEcho('share-social', { issue: number, method }));
}
