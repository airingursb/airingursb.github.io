import clips from '../../assets/bear-study/daily.json';
import { BearAtlasCache, BearAtlasLoadError } from './atlas-cache';
import { BearTimeline, type ClipId } from './timeline';
import { PetInteraction } from './pet-interaction';
import { BearLifeScene } from './scene';
import { routineDelay } from './life';

const labels = { typing: '写代码', reading: '读会儿书', sleep: '打个盹', pet: '摸摸头', drink: '喝一口', music: '听会儿歌', stretch: '伸个懒腰', water: '给植物浇水', shy: '小熊有点害羞', coffee: '抱着杯子慢慢醒来', rain: '听着新加坡的雨', camera: '带回一些旅行照片' };

export class DailyBear extends HTMLElement {
  private cleanup: (() => void) | undefined;
  connectedCallback() {
    const canvas = this.querySelector('canvas');
    const poster = this.querySelector('img');
    const controls = this.querySelector<HTMLElement>('[data-controls]');
    const head = this.querySelector<HTMLButtonElement>('[data-action="head"]');
    const caption = this.querySelector<HTMLElement>('[data-caption]');
    if (!canvas || !poster || !controls || !head || !caption) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const timeline = new BearTimeline(clips);
    const petting = new PetInteraction();
    const cache = new BearAtlasCache(clips);
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let enabled = !preference.matches, inView = false, alive = true;
    let active: { id: ClipId; image: HTMLImageElement } | undefined;
    let loading: ClipId | undefined;
    let raf = 0, previous = 0, request = 0, messageTimer = 0;
    let routineTime = 0, nextRoutine = routineDelay(Math.random());
    const scene = new BearLifeScene(this, id => { void choose(id, false); });
    let painted = '';

    const say = (message: string) => {
      clearTimeout(messageTimer);
      caption.textContent = message;
      messageTimer = window.setTimeout(() => { caption.textContent = ''; }, 2400);
    };
    const syncLabels = () => {
      this.dataset.state = timeline.clip;
      this.dataset.phase = timeline.phase;
      this.dataset.enabled = String(enabled);
      head.ariaLabel = timeline.clip === 'sleep' ? '叫醒小熊' : '摸摸小熊';
    };
    const render = (): boolean => {
      syncLabels();
      const id = timeline.clip;
      if (active?.id !== id) {
        if (loading !== id) {
          loading = id;
          cache.get(id).then(image => {
            if (!alive || timeline.clip !== id) return;
            active = { id, image };
            loading = undefined;
            canvas.hidden = false; poster.hidden = true; controls.hidden = false;
            update();
          }, (error: unknown) => {
            if (!(error instanceof BearAtlasLoadError)) throw error;
            if (!alive || timeline.clip !== id) return;
            loading = undefined; enabled = false;
            say('动作没加载好，稍后再试试');
            if (active) timeline.request(active.id, true);
            syncLabels();
            this.dataset.playing = 'false';
          });
        }
        return false;
      }
      scene.sync(timeline.clip, timeline.phase);
      const key = `${id}:${timeline.frame}`;
      if (key !== painted) {
        const c = clips[id];
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = false;
        context.drawImage(active.image, timeline.frame % c.columns * c.cellWidth,
          Math.floor(timeline.frame / c.columns) * c.cellHeight, c.cellWidth, c.cellHeight,
          0, canvas.height - c.cellHeight, c.cellWidth, c.cellHeight);
        painted = key;
        this.dataset.frame = String(timeline.frame);
      }
      return true;
    };
    const choose = async (id: ClipId, announce = true) => {
      const token = ++request;
      if (announce) say(id === 'typing' && timeline.clip === 'sleep' ? '轻轻叫醒小熊…' : labels[id]);
      try {
        await cache.get(id);
        if (!alive || token !== request) return;
        enabled = !preference.matches;
        timeline.request(id, !enabled);
        routineTime = 0;
        update();
      } catch (error) {
        if (!(error instanceof BearAtlasLoadError)) throw error;
        if (alive && token === request) say('动作没加载好，点一下再试试');
      }
    };
    const tick = (now: number) => {
      const delta = previous ? Math.min(now - previous, 100) : 0;
      previous = now;
      timeline.advance(delta);
      routineTime += delta;
      if (routineTime >= 6000 && timeline.phase === 'hold' && scene.arrival()) {
        routineTime = 0;
        void choose('camera', false);
      }
      if (routineTime >= nextRoutine && timeline.phase === 'hold') {
        routineTime = 0;
        nextRoutine = routineDelay(Math.random());
        void choose(scene.nextAction(Math.random()), false);
      }
      if (render()) raf = requestAnimationFrame(tick);
      else this.dataset.playing = 'false';
    };
    const update = () => {
      cancelAnimationFrame(raf); previous = 0;
      const ready = render();
      const playing = ready && enabled && inView && !document.hidden;
      this.dataset.playing = String(playing);
      if (playing) raf = requestAnimationFrame(tick);
    };
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest('button');
      if (!button || !this.contains(button)) return;
      const action = button.dataset.action;
      if (action === 'head') {
        if (timeline.clip === 'sleep') { petting.reset(); void choose('typing'); }
        else {
          const reaction = petting.next(performance.now());
          if (reaction) void choose(reaction);
        }
      } else if (action === 'drink' || action === 'typing' || action === 'water') void choose(action);
    };
    const reduce = () => {
      enabled = !preference.matches;
      if (!enabled) timeline.settle();
      update();
    };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    observer.observe(this);
    this.addEventListener('click', click);
    document.addEventListener('visibilitychange', update);
    preference.addEventListener('change', reduce);
    scene.start();
    update();
    this.cleanup = () => {
      scene.stop();
      alive = false; request++;
      cancelAnimationFrame(raf); clearTimeout(messageTimer); observer.disconnect();
      this.removeEventListener('click', click);
      document.removeEventListener('visibilitychange', update);
      preference.removeEventListener('change', reduce);
    };
  }
  disconnectedCallback() { this.cleanup?.(); }
}
