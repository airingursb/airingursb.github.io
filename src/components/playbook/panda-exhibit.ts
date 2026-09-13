import { createAtlasRenderer, createFrameAnimator, type FrameAnimator, type AtlasManifest } from '../../lib/blog-pet-animator';
import { computePointerVector } from '../../lib/blog-pet-pointer';

class PandaExhibit extends HTMLElement {
  private cleanup: (() => void) | undefined;
  connectedCallback() {
    this.cleanup?.();
    const canvas = this.querySelector('canvas');
    const poster = this.querySelector('img');
    const stage = this.querySelector<HTMLElement>('[data-pointer-stage]');
    const angle = this.querySelector<HTMLInputElement>('[data-direction]');
    const frameInput = this.querySelector<HTMLInputElement>('[data-frame]');
    const dot = this.querySelector<HTMLElement>('.pb-orbit-target');
    const status = this.querySelector<HTMLElement>('[data-panda-status]');
    const angleOutput = this.querySelector('[data-angle-output]');
    const frameOutput = this.querySelector('[data-frame-output]');
    if (!canvas || !poster || !stage || !angle || !frameInput || !dot || !status) return;
    const en = this.dataset.lang === 'en';
    const manifest: AtlasManifest = {
      asset: 'motion.webp', frameCount: Number(this.dataset.frames), columns: Number(this.dataset.columns),
      rows: Number(this.dataset.rows), cellWidth: Number(this.dataset.cell), cellHeight: Number(this.dataset.cell),
      atlasWidth: Number(this.dataset.columns) * Number(this.dataset.cell), atlasHeight: Number(this.dataset.rows) * Number(this.dataset.cell), circular: true,
    };
    const start = Number(this.dataset.start);
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const abort = new AbortController();
    const { signal } = abort;
    let mode = 'follow', paused = false, alive = true, visible = true, currentFrame = 0;
    let renderer: ReturnType<typeof createAtlasRenderer> | undefined;
    let animator: FrameAnimator | undefined;
    const atlas = new Image();
    const describe = () => {
      status.textContent = paused ? (en ? 'Paused. Resume to explore.' : '已暂停，继续后可操作。')
        : preference.matches ? (en ? 'Reduced motion: input selects stills directly.' : '减少动态效果：输入直接选择静帧。')
          : mode === 'frames' ? (en ? 'Frame inspection: no easing between samples.' : '逐帧查看：直接显示采样帧。') : (en ? 'Ready. Try a full circle.' : '准备好了，试着绕一圈。');
    };
    const show = (frame: number) => {
      currentFrame = frame;
      renderer?.render(frame);
      this.dataset.frame = String(frame);
      if (frameOutput) frameOutput.textContent = `${String(frame).padStart(2, '0')} / ${manifest.frameCount - 1}`;
      frameInput.value = String(frame);
    };
    const buildAnimator = () => {
      animator?.destroy();
      animator = createFrameAnimator({ frameCount: manifest.frameCount, initialFrame: currentFrame, circular: true, reducedMotion: preference.matches || mode === 'frames' || !visible, render: show });
      describe();
    };
    const targetAngle = (degrees: number) => {
      if (paused || !animator) return;
      const radians = degrees * Math.PI / 180;
      angle.value = String(Math.round(degrees));
      if (angleOutput) angleOutput.textContent = `${Math.round(degrees)}°`;
      dot.style.transform = `translate(${Math.cos(radians) * 134}px, ${Math.sin(radians) * 134}px)`;
      animator.setDirection(Math.cos(radians), Math.sin(radians), start);
    };
    const onPointer = (event: PointerEvent) => {
      if (mode !== 'follow' || paused || preference.matches) return;
      if (event.pointerType === 'touch' && event.type !== 'pointerdown' && !stage.hasPointerCapture(event.pointerId)) return;
      const rect = canvas.getBoundingClientRect();
      const vector = computePointerVector({ clientX: event.clientX, clientY: event.clientY, originX: rect.left + rect.width / 2, originY: rect.top + rect.height / 2, deadZone: rect.width * .08 });
      if (!vector.inDeadZone) targetAngle(Math.atan2(vector.dy, vector.dx) * 180 / Math.PI);
    };
    stage.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') stage.setPointerCapture(event.pointerId); onPointer(event); }, { signal });
    stage.addEventListener('pointermove', onPointer, { signal });
    angle.addEventListener('input', () => targetAngle(Number(angle.value)), { signal });
    frameInput.addEventListener('input', () => {
      const frame = Number(frameInput.value);
      const radians = start + frame / manifest.frameCount * Math.PI * 2;
      const degrees = ((radians * 180 / Math.PI + 540) % 360) - 180;
      targetAngle(degrees);
    }, { signal });
    this.addEventListener('click', event => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.pandaMode) {
        mode = button.dataset.pandaMode;
        this.querySelectorAll('[data-panda-mode]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
        const controls = this.querySelector<HTMLElement>('[data-frame-controls]');
        if (controls) controls.hidden = mode !== 'frames';
        if (renderer) buildAnimator();
      }
      if (button.hasAttribute('data-panda-pause')) {
        paused = !paused;
        button.setAttribute('aria-pressed', String(paused));
        button.textContent = paused ? (en ? 'Resume following' : '继续跟随') : (en ? 'Pause following' : '暂停跟随');
        angle.disabled = paused || !renderer;
        frameInput.disabled = paused || !renderer;
        if (paused) animator?.destroy();
        else if (renderer) buildAnimator();
        describe();
      }
    }, { signal });
    preference.addEventListener('change', () => { if (renderer) buildAnimator(); }, { signal });
    const visibility = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (!renderer) return;
      if (!paused) buildAnimator();
    });
    visibility.observe(stage);
    document.addEventListener('visibilitychange', () => { if (document.hidden) animator?.destroy(); else if (renderer && !paused) buildAnimator(); }, { signal });
    const resize = new ResizeObserver(() => { renderer?.resize(); animator?.invalidate(); });
    resize.observe(canvas);
    atlas.addEventListener('load', () => {
      if (!alive) return;
      if (!canvas.getContext('2d')) {
        status.textContent = en ? 'Canvas is unavailable; the original still is shown.' : '当前环境无法绘制 Canvas，已保留原始静帧。';
        return;
      }
      canvas.hidden = false;
      renderer = createAtlasRenderer({ canvas, image: atlas, manifest });
      poster.hidden = true;
      buildAnimator();
      angle.disabled = paused;
      frameInput.disabled = paused;
      this.dataset.loaded = 'true';
    }, { signal });
    atlas.addEventListener('error', () => {
      status.textContent = en ? 'Atlas unavailable. The original still is shown; reload to retry.' : '图集暂时没加载好，已保留原始静帧；刷新可重试。';
      this.dataset.loaded = 'error';
    }, { signal });
    atlas.src = '/oil-motion/blog-pet/motion.webp';
    this.cleanup = () => { alive = false; abort.abort(); visibility.disconnect(); resize.disconnect(); animator?.destroy(); renderer?.destroy(); };
  }
  disconnectedCallback() { this.cleanup?.(); }
}
if (!customElements.get('panda-exhibit')) customElements.define('panda-exhibit', PandaExhibit);
