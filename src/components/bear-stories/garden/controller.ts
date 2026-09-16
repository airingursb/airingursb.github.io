import { gardenRequest } from './api';
import type { GardenResult, GardenState } from './api';
import { gardenCopy } from './copy';
import type { GardenStage } from './copy';
import { GardenMotion } from './motion';
import type { BearFooterScene } from '../../bear-footer/player';

function isStage(value: string): value is GardenStage {
  return value === 'seed' || value === 'sprout' || value === 'bud' || value === 'bloom';
}

class SharedGarden extends HTMLElement {
  private cleanup: (() => void) | undefined;

  connectedCallback() {
    this.cleanup?.();
    const scene = this.querySelector<BearFooterScene>('bear-footer-scene');
    const plant = this.querySelector<HTMLImageElement>('.shared-garden-growth');
    const button = this.querySelector<HTMLButtonElement>('.shared-garden-water');
    const status = this.querySelector<HTMLElement>('.shared-garden-status');
    const label = this.querySelector<HTMLElement>('[data-garden-state]');
    if (!scene || !plant || !button || !status || !label) return;
    let language = this.dataset.lang === 'en' ? 'en' : 'zh';
    let copy = gardenCopy[language === 'en' ? 'en' : 'zh'];
    const shared = this.dataset.shared === 'true';
    const preview = this.dataset.preview === 'true';
    const abort = new AbortController();
    const { signal } = abort;
    let stored: GardenState | null = null;
    let submitting = false;
    let syncing = false;
    let inspecting: GardenStage | null = null;
    let sessionRead: Promise<GardenResult> | null = null;
    const readSession = () => {
      sessionRead ??= gardenRequest(false, preview).finally(() => { sessionRead = null; });
      return sessionRead;
    };
    const motion = new GardenMotion(scene, plant, () => {
      status.textContent = copy.media;
    });
    const controls = document.querySelectorAll<HTMLButtonElement>('[data-garden-inspect]');
    const previewStatus = document.querySelector<HTMLElement>('[data-garden-preview-status]');
    const feedback = new MutationObserver(() => {
      if (previewStatus) previewStatus.textContent = status.textContent;
    });
    feedback.observe(status, { childList: true, characterData: true, subtree: true });

    const showStage = (stage: GardenStage) => {
      motion.setStage(stage);
      this.dataset.stage = stage;
      this.dataset.view = inspecting ? 'inspection' : 'shared';
      label.textContent = `${inspecting ? (language === 'en' ? 'Growth still' : '生长静帧') : shared ? copy.shared : copy.local} · ${copy.stages[stage]}`;
    };
    const accept = (state: GardenState) => {
      stored = state;
      this.dataset.total = String(state.totalWaterings);
      this.dataset.source = state.source;
      this.dataset.wateredToday = String(state.wateredToday);
      if (!inspecting) showStage(state.stage);
    };
    const selectShared = () => {
      inspecting = null;
      for (const control of controls) control.setAttribute('aria-pressed', String(control.dataset.gardenInspect === 'shared'));
      showStage(stored?.stage ?? 'seed');
    };
    const sync = async () => {
      if (!shared || syncing || submitting) return;
      syncing = true;
      const result = await readSession();
      syncing = false;
      if (!this.isConnected) return;
      switch (result.kind) {
        case 'ok':
          accept(result.state);
          if (!inspecting && !motion.active) status.textContent = result.state.wateredToday ? copy.already : copy.ready;
          break;
        case 'session': status.textContent = copy.session; break;
        case 'unavailable':
          if (!stored) status.textContent = copy.unavailable;
          break;
        default: result satisfies never;
      }
    };
    const water = async () => {
      if (submitting || motion.active) return;
      selectShared();
      if (!shared) { void motion.play(); status.textContent = copy.localOnly; return; }
      submitting = true;
      button.setAttribute('aria-busy', 'true');
      status.textContent = copy.saving;
      void motion.play();
      if (!stored) await syncSession();
      const result = await gardenRequest(true, preview);
      submitting = false;
      button.removeAttribute('aria-busy');
      if (!this.isConnected) return;
      switch (result.kind) {
        case 'ok':
          accept(result.state);
          status.textContent = result.state.accepted ? copy.saved : copy.already;
          break;
        case 'session': status.textContent = copy.session; break;
        case 'unavailable': status.textContent = copy.offline; break;
        default: result satisfies never;
      }
    };
    const syncSession = async () => {
      const result = await readSession();
      switch (result.kind) {
        case 'ok': accept(result.state); break;
        case 'session':
        case 'unavailable': break;
        default: result satisfies never;
      }
    };
    button.addEventListener('click', () => { void water(); }, { signal });
    for (const control of controls) control.addEventListener('click', () => {
      if (submitting) return;
      const requested = control.dataset.gardenInspect;
      motion.stop();
      if (requested && isStage(requested)) {
        inspecting = requested;
        showStage(requested);
        status.textContent = copy.simulation;
        for (const other of controls) other.setAttribute('aria-pressed', String(other === control));
      } else {
        selectShared();
        status.textContent = stored?.wateredToday ? copy.already : copy.ready;
        void sync();
      }
    }, { signal });
    const interval = window.setInterval(() => {
      if (motion.inView && !document.hidden && !motion.active) void sync();
    }, 10000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && motion.inView) void sync();
    }, { signal });
    const localize = () => {
      const previous = copy;
      language = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
      copy = gardenCopy[language === 'en' ? 'en' : 'zh'];
      this.dataset.lang = language;
      const statusKey = Object.entries(previous).find(([key, value]) => key !== 'stages' && value === status.textContent)?.[0];
      if (statusKey && statusKey in copy) {
        const translated = Object.entries(copy).find(([key]) => key === statusKey)?.[1];
        if (typeof translated === 'string') status.textContent = translated;
      }
      button.setAttribute('aria-label', copy.water);
      scene.setAttribute('aria-label', copy.scene);
      scene.querySelector('[data-footer-bear]')?.setAttribute('aria-label', language === 'en' ? 'Say hello to the bear' : '和小熊打个招呼');
      scene.querySelector('[data-book]')?.setAttribute('aria-label', language === 'en' ? 'Read a passage together' : '一起读一页书');
      scene.querySelector('[data-footer-subscribe]')?.setAttribute('aria-label', language === 'en' ? 'Receive new posts by email' : '接收新文章来信');
      showStage(inspecting ?? stored?.stage ?? 'seed');
    };
    const languageObserver = new MutationObserver(localize);
    localize();
    languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    void sync();
    this.cleanup = () => { abort.abort(); clearInterval(interval); motion.destroy(); feedback.disconnect(); languageObserver.disconnect(); };
  }

  disconnectedCallback() { this.cleanup?.(); }
}

if (!customElements.get('bear-shared-garden')) customElements.define('bear-shared-garden', SharedGarden);
