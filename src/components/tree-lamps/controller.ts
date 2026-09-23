import { lampRequest } from './api';
import type { LampResult, LampState } from './api';
import { lampCopy } from './copy';
import type { LampMessage } from './copy';
import type { BearFooterScene } from '../bear-footer/player';
import { mountTreeLampMotion } from '../bear-footer/lamp-motion';

class TreeLamps extends HTMLElement {
  private cleanup: (() => void) | undefined;

  connectedCallback() {
    this.cleanup?.();
    const scene = this.closest<BearFooterScene>('bear-footer-scene');
    const status = this.querySelector<HTMLElement>('[role="status"]');
    if (!scene || !status) return;
    const abort = new AbortController();
    const { signal } = abort;
    const preview = this.dataset.preview === 'true';
    const buttons = [...this.querySelectorAll<HTMLButtonElement>('[data-lamp]')];
    const art = [...this.querySelectorAll<SVGGElement>('[data-lamp-art]')];
    const stopMotion = mountTreeLampMotion(scene);
    let copy = lampCopy[this.dataset.lang === 'en' ? 'en' : 'zh'];
    let message: LampMessage = 'checking';
    let state: LampState | null = null;
    let pending: number | null = null;
    let visible = false;
    let read: Promise<LampResult> | null = null;
    let boundaryTimer = 0;
    let errorTimer = 0;
    const announce = (next: LampMessage) => {
      message = next;
      this.dataset.state = next;
      if (status.textContent === copy[next]) return;
      status.textContent = copy[next];
      this.dispatchEvent(new CustomEvent('tree-lamps-status', { bubbles: true, detail: { message: status.textContent } }));
    };
    const render = () => {
      this.dataset.active = String(state?.active ?? false);
      this.dataset.source = state?.source ?? '';
      for (const button of buttons) {
        const index = Number(button.dataset.lamp);
        const lit = state?.lights.includes(index) ?? false;
        const daytime = state !== null && !state.active;
        button.setAttribute('aria-pressed', String(lit));
        button.setAttribute('aria-busy', String(index === pending));
        button.setAttribute('aria-disabled', String(pending !== null || daytime || state?.contributed || lit));
        button.setAttribute('aria-label', daytime ? copy.resting(index) : lit ? copy.glowing(index) : copy.light(index));
      }
      for (const lamp of art) {
        const index = Number(lamp.dataset.lampArt);
        lamp.dataset.lit = String(state?.lights.includes(index) ?? false);
        lamp.dataset.pending = String(index === pending);
      }
    };
    const readState = () => {
      read ??= lampRequest({ preview, lamp: null, signal }).finally(() => { read = null; });
      return read;
    };
    const restingMessage = (): LampMessage => !state ? 'unavailable' : !state.active ? 'daytime'
      : state.contributed ? 'already' : state.lights.length === 6 ? 'full' : 'ready';
    const accept = (next: LampState) => {
      state = next;
      render();
      clearTimeout(boundaryTimer);
      const delay = Date.parse(next.nextChangeAt) - Date.parse(next.serverNow);
      if (!next.simulated && delay > 0) boundaryTimer = window.setTimeout(() => {
        // Expire the view at the server's boundary even if the next request fails.
        state = null;
        render();
        announce('checking');
        if (visible && !document.hidden) void sync();
      }, Math.min(delay + 50, 24 * 3600000));
    };
    const showFailure = (kind: 'session' | 'unavailable') => {
      if (kind === 'session') state = null;
      announce(kind);
      render();
    };
    const sync = async () => {
      if (!visible || document.hidden || pending !== null) return;
      const result = await readState();
      if (signal.aborted || pending !== null) return;
      switch (result.kind) {
        case 'ok': accept(result.state); announce(restingMessage()); break;
        case 'session':
        case 'unavailable': showFailure(result.kind); break;
        default: result satisfies never;
      }
    };
    const light = async (index: number) => {
      if (pending !== null) return;
      if (state && (!state.active || state.contributed || state.lights.includes(index))) {
        announce(!state.active ? 'daytime' : state.contributed ? 'already' : state.lights.length === 6 ? 'full' : 'occupied'); return;
      }
      pending = index;
      announce('pending'); render();
      if (!state || read) {
        const session = await readState();
        if (signal.aborted) return;
        switch (session.kind) {
          case 'ok': accept(session.state); break;
          case 'session':
          case 'unavailable': pending = null; showFailure(session.kind); return;
          default: session satisfies never;
        }
      }
      const result = await lampRequest({ preview, lamp: index, signal });
      if (signal.aborted) return;
      pending = null;
      switch (result.kind) {
        case 'ok':
          accept(result.state);
          announce(result.state.outcome === 'state' ? restingMessage() : result.state.outcome);
          if (result.state.accepted) {
            scene.dataset.activeLamp = String(index);
            for (const lamp of art) lamp.dataset.ours = String(Number(lamp.dataset.lampArt) === index);
            scene.dispatchEvent(new CustomEvent('bear-footer-lamp-request', { detail: { lampIndex: index } }));
          }
          break;
        case 'session':
        case 'unavailable':
          showFailure(result.kind);
          for (const lamp of art) lamp.dataset.error = String(Number(lamp.dataset.lampArt) === index);
          clearTimeout(errorTimer);
          errorTimer = window.setTimeout(() => { for (const lamp of art) delete lamp.dataset.error; }, 1800);
          break;
        default: result satisfies never;
      }
    };
    for (const button of buttons) button.addEventListener('click', () => { void light(Number(button.dataset.lamp)); }, { signal });
    scene.addEventListener('bear-footer-lamp-complete', () => {
      delete scene.dataset.activeLamp;
      for (const lamp of art) delete lamp.dataset.ours;
    }, { signal });
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) void sync();
    }, { threshold: 0 });
    observer.observe(scene);
    const interval = window.setInterval(() => { void sync(); }, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync(); }, { signal });
    const localize = () => {
      copy = lampCopy[document.documentElement.lang.startsWith('en') ? 'en' : 'zh'];
      announce(message); render();
    };
    const language = new MutationObserver(localize);
    language.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    localize();
    this.cleanup = () => {
      abort.abort(); observer.disconnect(); language.disconnect(); stopMotion();
      clearInterval(interval); clearTimeout(boundaryTimer); clearTimeout(errorTimer);
    };
  }
  disconnectedCallback() { this.cleanup?.(); }
}
if (!customElements.get('bear-tree-lamps')) customElements.define('bear-tree-lamps', TreeLamps);
