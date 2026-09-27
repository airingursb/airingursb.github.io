(() => {
  const en = document.documentElement.lang.startsWith('en');
  const dialog = document.querySelector('#issue-share');
  const input = document.querySelector('#share-url');
  const copyButton = document.querySelector('#share-copy');
  const copyLabel = copyButton.querySelector('span');
  const status = document.querySelector('#share-status');
  const nativeButton = document.querySelector('#share-native');
  const issueUrl = new URL(window.location.pathname, window.location.origin).href;
  input.value = issueUrl;
  const shareText = dialog.dataset.shareTitle + ' ' + issueUrl;
  document.querySelector('#share-threads').href = 'https://www.threads.net/intent/post?text=' + encodeURIComponent(shareText);
  document.querySelector('#share-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(dialog.dataset.shareTitle) + '&url=' + encodeURIComponent(issueUrl);
  if (window.location.hostname.startsWith('100.')) {
    document.querySelector('#share-note').textContent = (en ? "This is a Tailscale preview; recipients need the same network. The cover image can be shared anywhere." : '这是 Tailscale 预览链接，接收方也需连接同一网络。封面图片可直接分享。');
  }
  let opener = null;

  document.querySelectorAll('.share-trigger').forEach((button) => {
    button.addEventListener('click', () => {
      opener = button;
      copyButton.removeAttribute('data-copied');
      copyLabel.textContent = (en ? "Copy link" : '复制链接');
      status.textContent = (en ? "Save the cover and send it to a friend who reads with you." : '可保存封面图片，发给一起阅读的朋友。');
      document.body.classList.add('sharing-issue');
      dialog.showModal();
      dialog.querySelector('.share-close').focus();
    });
  });
  dialog.querySelector('.share-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not([hidden]), a[href], input')];
    const target = event.shiftKey && document.activeElement === controls[0] ? controls.at(-1)
      : !event.shiftKey && document.activeElement === controls.at(-1) ? controls[0] : null;
    if (target) {
      event.preventDefault();
      target.focus();
    }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('sharing-issue');
    opener?.focus();
  });
  input.addEventListener('click', () => input.select());

  async function copyLink() {
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(input.value);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (!copied) {
      input.focus();
      input.select();
      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }
    }
    copyButton.dataset.copied = String(copied);
    copyLabel.textContent = copied ? (en ? "Copied" : '已复制') : (en ? "Copy link" : '复制链接');
    status.textContent = copied ? (en ? "Link copied. Ready to send to a friend." : '链接已复制。可以粘贴给朋友了。') : (en ? "Could not copy automatically. The link is selected; long-press or use ⌘C / Ctrl+C." : '未能自动复制。链接已选中，请长按或按 ⌘C / Ctrl+C 复制。');
    if (copied) copyButton.focus();
  }
  copyButton.addEventListener('click', copyLink);

  nativeButton.hidden = typeof navigator.share !== 'function';
  nativeButton.addEventListener('click', async () => {
    try {
      await navigator.share({title: dialog.dataset.shareTitle, url: input.value});
      status.textContent = (en ? "Opened system sharing." : '已交给系统分享。');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      status.textContent = (en ? "System sharing is unavailable. Copy the link or save the cover instead." : '系统分享暂不可用，可以复制链接或保存封面。');
    }
  });
})();
