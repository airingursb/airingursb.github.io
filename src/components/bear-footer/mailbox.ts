const garden = document.querySelector<HTMLElement>('.bear-garden');
const subscription = garden?.querySelector<HTMLDetailsElement>('.garden-subscribe');
const mailbox = garden?.querySelector<HTMLButtonElement>('[data-footer-subscribe]');

if (garden && subscription && mailbox) {
  const syncOpen = () => {
    garden.dataset.mailboxOpen = String(subscription.open);
    mailbox.setAttribute('aria-expanded', String(subscription.open));
  };
  mailbox.setAttribute('aria-controls', subscription.id);
  subscription.addEventListener('toggle', syncOpen);
  syncOpen();

  garden.addEventListener('bear-subscribe-pending', () => {
    subscription.open = true;
    garden.dataset.mailState = 'sending';
  });
  garden.addEventListener('bear-subscribe-error', () => {
    subscription.open = true;
    garden.dataset.mailState = 'idle';
  });
  garden.addEventListener('bear-subscribe-success', () => {
    if (garden.dataset.mailState !== 'sending') return;
    subscription.open = true;
    garden.dataset.mailState = 'sent';
    garden.dispatchEvent(new CustomEvent('bear-letter-sent', { bubbles: true }));
  });
}
