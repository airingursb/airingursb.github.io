export class BearWindow extends HTMLElement {
  connectedCallback(): void {
    const button = this.querySelector('button');
    if (button) button.disabled = false;
    this.addEventListener('click', this.toggleCurtain);
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.toggleCurtain);
  }

  private toggleCurtain = (): void => {
    const button = this.querySelector('button');
    if (!button) return;
    const closed = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(closed));
    button.setAttribute('aria-label', closed ? '拉开小熊的窗帘' : '拉上小熊的窗帘');
  };
}
