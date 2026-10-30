// src/scripts/shelf.ts
//
// The book / Blu-ray shelves on the homepage (DoubanShelves.astro). Every
// item is a box whose left edge is the hinge: the spine face is turned -90°
// on the left, the cover sits in front. Turned 90° only the spine shows
// (width = spine), at 0° the cover faces out (width = cover). Each frame of
// the turn re-lays the width as cover·cosθ + spine·sinθ, so neighbours are
// pushed aside smoothly. Books near the cover-out one lean towards it; the
// rest get a small tilt from a hash of the title (decoration only).
//
// Two shelves side by side share one scale so their books are equally tall
// and the two cards line up.

const H0 = 200;       // design height of a book; real height = H0 × scale
const TURN_MS = 480;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type El = { li: HTMLElement; btn: HTMLButtonElement; lean: HTMLElement; d3: HTMLElement; u: number; ar: number; n: number; m: number; seed: number };

class Shelf {
  root: HTMLElement;
  vp: HTMLElement;
  els: El[];
  caps: HTMLElement[];
  isCase: boolean;
  sel = 0;
  s = 0.8;
  prog: number[];
  tilt: number[];
  raf = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.vp = root.querySelector<HTMLElement>('.shelf-vp')!;
    this.caps = [...root.querySelectorAll<HTMLElement>('.shelf-cap')];
    this.isCase = root.dataset.shelf === 'movie';
    const lis = [...root.querySelectorAll<HTMLElement>('.bk')];
    this.sel = Math.max(0, lis.findIndex((li) => li.classList.contains('on')));
    this.els = lis.map((li) => {
      const st = li.style;
      return {
        li,
        btn: li.querySelector<HTMLButtonElement>('.bk-btn')!,
        lean: li.querySelector<HTMLElement>('.bk-lean')!,
        d3: li.querySelector<HTMLElement>('.bk-3d')!,
        u: parseFloat(st.getPropertyValue('--u')) || 16,
        ar: parseFloat(st.getPropertyValue('--ar')) || 0.7,
        n: Number(li.dataset.n) || 4,
        m: Number(li.dataset.m) || 0,
        seed: hash(li.querySelector('.bk-spine b')?.textContent || ''),
      };
    });
    this.prog = this.els.map((_, i) => (i === this.sel ? 1 : 0));
    this.tilt = this.tilts(this.sel);

    this.els.forEach((e, i) => e.btn.addEventListener('click', () => this.select(i)));
    root.querySelector('.shelf-track')!.addEventListener('keydown', (ev) => {
      const e = ev as KeyboardEvent;
      const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 } as Record<string, number>)[e.key];
      let n = this.sel;
      if (step) n = Math.max(0, Math.min(this.els.length - 1, n + step));
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = this.els.length - 1;
      else return;
      e.preventDefault();
      this.select(n);
      this.els[n].btn.focus({ preventScroll: true });
    });
    this.vp.addEventListener('scroll', () => this.edges(), { passive: true });
  }

  tilts(sel: number) {
    return this.els.map((e, i) => {
      if (i === sel) return 0;
      const d = Math.abs(i - sel), side = i > sel ? -1 : 1, j = ((e.seed % 7) - 3) * 0.12;
      return d === 1 ? side * 1.7 : d === 2 ? side * 0.7 + j * 0.5 : j;
    });
  }

  paint() {
    const H = H0 * this.s;
    this.els.forEach((e, i) => {
      const p = this.prog[i], t = this.tilt[i];
      const sw = e.u * this.s, cw = H * e.ar;
      const th = (1 - p) * Math.PI / 2;
      const w = cw * Math.cos(th) + sw * Math.sin(th);
      const lean = t * (1 - p);
      const ex = H * Math.sin(Math.abs(lean) * Math.PI / 180);
      e.li.style.width = (w + ex).toFixed(2) + 'px';
      e.li.style.zIndex = p > 0.01 ? '2' : '1';
      e.lean.style.width = w.toFixed(2) + 'px';
      e.lean.style.left = (lean < 0 ? ex : 0).toFixed(2) + 'px';
      e.lean.style.transformOrigin = (lean < 0 ? '100%' : '0') + ' 100%';
      e.lean.style.transform = `rotate(${lean.toFixed(3)}deg)`;
      e.d3.style.transform = `rotateY(${((1 - p) * 90).toFixed(2)}deg)`;
      const sh = e.li.querySelector<HTMLElement>('.bk-shadow');
      if (sh) sh.style.opacity = (0.55 + 0.45 * p).toFixed(2);
    });
  }

  setScale(s: number) {
    this.s = s;
    const H = H0 * s;
    this.root.style.setProperty('--s', String(s));
    this.els.forEach((e) => {
      // shrink long titles so the whole title + author fit on the spine
      const room = H - (this.isCase ? 40 : 26) * s;
      const fs = Math.max(7, Math.min(12.5 * s + 0.8, e.u * s * 0.62, room / (e.n * 1.09 + e.m * 0.8)));
      e.li.style.setProperty('--fs', fs.toFixed(2) + 'px');
    });
    this.paint();
    this.edges();
  }

  /** Width needed at scale 1: every spine, the widest cover, and the lean. */
  need() {
    let sum = 0, extra = 0;
    this.els.forEach((e) => { sum += e.u; extra = Math.max(extra, H0 * e.ar - e.u); });
    const lean = this.tilt.reduce((a, t) => a + H0 * Math.sin(Math.abs(t) * Math.PI / 180), 0);
    return sum + extra + lean + (this.els.length - 1) + 4;
  }

  fit() {
    const avail = this.vp.clientWidth - 12;
    return Math.max(0.64, Math.min(0.92, avail / this.need()));
  }

  edges() {
    const vp = this.vp, max = vp.scrollWidth - vp.clientWidth, ov = max > 2;
    this.root.classList.toggle('ov', ov);
    vp.style.setProperty('--ml', ov && vp.scrollLeft > 2 ? '18px' : '0px');
    vp.style.setProperty('--mr', ov && vp.scrollLeft < max - 2 ? '22px' : '0px');
  }

  state() {
    this.els.forEach((e, i) => {
      const on = i === this.sel;
      e.li.classList.toggle('on', on);
      e.btn.setAttribute('aria-selected', String(on));
      e.btn.tabIndex = on ? 0 : -1;
    });
    this.caps.forEach((c, i) => { c.hidden = i !== this.sel; });
  }

  reveal(smooth: boolean) {
    const vp = this.vp, li = this.els[this.sel].li;
    if (vp.scrollWidth <= vp.clientWidth + 2) return;
    const l = li.offsetLeft - 6, r = l + li.offsetWidth + 12, x = vp.scrollLeft;
    const to = l < x ? l : r > x + vp.clientWidth ? r - vp.clientWidth : x;
    if (to !== x) vp.scrollTo({ left: Math.max(0, to), behavior: smooth && !reduced() ? 'smooth' : 'auto' });
  }

  select(i: number) {
    if (i === this.sel) return;
    const fromP = this.prog.slice(), fromT = this.tilt.slice();
    const toP = this.els.map((_, k) => (k === i ? 1 : 0)), toT = this.tilts(i);
    this.sel = i;
    this.state();
    if (this.raf) cancelAnimationFrame(this.raf);
    const done = () => {
      this.prog = toP; this.tilt = toT; this.raf = 0;
      this.paint(); this.reveal(true); this.edges();
    };
    if (reduced()) { done(); return; }
    const t0 = performance.now();
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / TURN_MS), k = ease(t);
      this.prog = fromP.map((v, j) => v + (toP[j] - v) * k);
      this.tilt = fromT.map((v, j) => v + (toT[j] - v) * k);
      this.paint();
      if (t < 1) this.raf = requestAnimationFrame(tick); else done();
    };
    this.raf = requestAnimationFrame(tick);
  }
}

export function initShelves(roots: NodeListOf<HTMLElement>) {
  const shelves = [...roots].map((r) => new Shelf(r));
  if (!shelves.length) return;

  const layout = () => {
    const want = shelves.map((s) => s.fit());
    // shelves on the same row (cards side by side) take the smaller scale
    const tops = shelves.map((s) => Math.round(s.root.closest('.card')!.getBoundingClientRect().top + window.scrollY));
    shelves.forEach((_, i) => {
      const row = shelves.map((__, j) => j).filter((j) => Math.abs(tops[j] - tops[i]) < 2);
      if (row.length > 1) want[i] = Math.min(...row.map((j) => want[j]));
    });
    shelves.forEach((s, i) => s.setScale(want[i]));
  };

  layout();
  let timer = 0;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = window.setTimeout(layout, 80); });
  document.fonts?.ready.then(layout);
}
