// Shared terminal window: the bottom shell prompt (`airing@ursb.me:~/x$ ▍`)
// plus the ⌘K window it opens (macOS title bar, prompt line with an input, a
// selectable list, footer hints). Used by the homepage navigator
// (src/scripts/home-nav.ts) and the blog search (src/scripts/blog-search.ts).
// Styles: src/styles/term-window.css, pulled in by src/components/TermWindow.astro.
//
// The page owns the content: `build()` writes rows into `tw.list` and returns
// how many are selectable (rows carry data-i="0..n-1"); `go(i)` acts on one.
// The window owns the chrome, opening/closing, focus, ↑↓ / ↵ / esc, ⌘K and "/".

export interface TermWindowConfig {
  /** Prefix for element ids (`${name}-q`, `${name}-list`). */
  name: string;
  /** Wider window for richer rows (blog search). */
  wide?: boolean;
  /** Title bar text, longest first; the first one that fits is shown (never clipped). */
  titles: () => string[];
  ariaLabel: () => string;
  promptAria: () => string;
  placeholder: () => string;
  /** Command shown after `$` in the window's prompt line (`cd`, `grep -i`). */
  cmd: () => string;
  /** Path shown in the window's prompt line when it opens. */
  path: () => string;
  /** Footer hints (HTML); the item count goes in the trailing `.n`. */
  footer: () => string;
  /** Optional HTML between the prompt line and the list (chips). */
  above?: () => string;
  /** Optional HTML below the list (preview pane). */
  below?: () => string;
  build: (tw: TermWindow) => number;
  go: (i: number, tw: TermWindow) => void;
  /** After the selection changes (preview). */
  onSelect?: (i: number, tw: TermWindow) => void;
  /** Before the first build of an open (preselect, reset state). */
  onOpen?: (tw: TermWindow) => void;
  /** After each typed change; default selects row 0. */
  onInput?: (tw: TermWindow) => void;
  /** Extra keys inside the input; return true when handled. */
  onKey?: (e: KeyboardEvent, tw: TermWindow) => boolean;
  /** After the chrome is (re)rendered: wire up `above` / `below`. */
  onRender?: (tw: TermWindow) => void;
  /** Focus the input on touch screens too (search wants the keyboard; the navigator does not). */
  focusOnTouch?: boolean;
}

export interface TermWindow {
  ps: HTMLButtonElement;
  win: HTMLDivElement;
  input: HTMLInputElement;
  list: HTMLDivElement;
  sel: number;
  count: number;
  open(q?: string): void;
  close(restore?: boolean): void;
  isOpen(): boolean;
  refresh(): void;
  paint(scroll?: boolean | 'center'): void;
  render(): void;
  showPrompt(show: boolean): void;
  setPath(path: string): void;
  setCount(text: string): void;
}

const escMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: unknown) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => escMap[c]);
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const LIGHTS = '<span class="tw-lights" aria-hidden="true"><i></i><i></i><i></i></span>';
export const userHTML = () => '<span class="tw-u">airing<span class="tw-u-host">@ursb.me</span></span><span class="tw-c">:</span>';
export const kbdHTML = () => '<span class="tw-kbd" aria-hidden="true"><kbd>' + (isMac ? '⌘' : 'Ctrl') + '</kbd><kbd>K</kbd></span>';

export function createTermWindow(cfg: TermWindowConfig): TermWindow {
  const root = document.documentElement;
  const ps = document.createElement('button');
  ps.type = 'button';
  ps.className = 'tw-ps tw-ps--' + cfg.name;
  const scrim = document.createElement('div');
  scrim.className = 'tw-scrim';
  const win = document.createElement('div');
  win.className = 'tw-win tw-win--' + cfg.name + (cfg.wide ? ' tw-win--wide' : '');
  win.tabIndex = -1;
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-modal', 'true');
  document.body.append(ps, scrim, win);

  let shownPath = '';
  let typing = 0;
  let lastFocus: Element | null = null;

  const tw: TermWindow = {
    ps, win,
    input: null as unknown as HTMLInputElement,
    list: null as unknown as HTMLDivElement,
    sel: 0,
    count: 0,
    isOpen: () => root.classList.contains('tw-open'),
    open,
    close,
    refresh,
    paint,
    render,
    showPrompt(show) {
      ps.classList.toggle('show', show);
    },
    setPath: typeTo,
    setCount(text) {
      const n = win.querySelector<HTMLElement>('.tw-ft .n');
      if (n) n.textContent = text;
    },
  };

  function psHTML(path: string) {
    return LIGHTS + '<span class="tw-line">' + userHTML() + '<span class="tw-p">' + esc(path) +
      '</span><span class="tw-d">$</span><span class="tw-cur" aria-hidden="true"></span></span>' + kbdHTML();
  }

  // Backspace the differing tail, then type the new path one char at a time.
  function typeTo(path: string) {
    const el = ps.querySelector<HTMLElement>('.tw-p');
    const my = ++typing;
    shownPath = path;
    if (!el) return;
    const from = el.textContent || '';
    if (from === path) return;
    if (reduceMotion() || !ps.classList.contains('show')) { el.textContent = path; ps.classList.remove('typing'); return; }
    let k = 0;
    while (k < from.length && k < path.length && from[k] === path[k]) k++;
    let cur = from;
    let phase: 'del' | 'type' = 'del';
    ps.classList.add('typing');
    (function step() {
      if (my !== typing) return;
      if (phase === 'del') { if (cur.length > k) cur = cur.slice(0, -1); else phase = 'type'; }
      if (phase === 'type' && cur.length < path.length) cur = path.slice(0, cur.length + 1);
      el.textContent = cur;
      if (cur !== path) setTimeout(step, phase === 'del' ? 16 : 30);
      else ps.classList.remove('typing');
    })();
  }

  // Title bar: show the longest title that fits between the traffic lights.
  function fitTitle() {
    const t = win.querySelector<HTMLElement>('.tw-tb .t');
    if (!t) return;
    const titles = cfg.titles();
    for (let i = 0; i < titles.length; i++) {
      t.textContent = titles[i];
      if (t.scrollWidth <= t.clientWidth + 1) return;
    }
  }

  function paint(scroll?: boolean | 'center') {
    tw.list.querySelectorAll<HTMLElement>('[data-i]').forEach((r) => {
      const on = +r.dataset.i! === tw.sel;
      r.classList.toggle('sel', on);
      r.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const s = tw.list.querySelector('[data-i].sel');
    if (s && scroll) s.scrollIntoView({ block: scroll === 'center' ? 'center' : 'nearest' });
    cfg.onSelect?.(tw.sel, tw);
  }

  function refresh() {
    tw.count = cfg.build(tw);
    if (tw.sel >= tw.count) tw.sel = tw.count - 1;
    if (tw.sel < 0) tw.sel = 0;
    paint();
  }

  function setLabel() {
    const label = win.querySelector<HTMLElement>('.tw-in label');
    if (label) label.innerHTML = userHTML() + '<span class="tw-p">' + esc(cfg.path()) + '</span><span class="tw-d">$</span> <span class="tw-c">' + esc(cfg.cmd()) + '</span>';
  }

  function open(q?: string) {
    lastFocus = document.activeElement;
    root.classList.add('tw-open');
    tw.input.value = typeof q === 'string' ? q : '';
    tw.sel = 0;
    setLabel();
    cfg.onOpen?.(tw);
    refresh();
    paint('center');
    fitTitle();
    if (cfg.focusOnTouch || matchMedia('(pointer:fine)').matches) {
      tw.input.focus({ preventScroll: true });
      setTimeout(() => tw.input.focus({ preventScroll: true }), 30);
    } else win.focus({ preventScroll: true });
  }

  function close(restore = true) {
    root.classList.remove('tw-open');
    tw.input.blur();
    if (restore && lastFocus instanceof HTMLElement && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
  }

  function render() {
    ps.innerHTML = psHTML(shownPath);
    ps.setAttribute('aria-label', cfg.promptAria());
    win.setAttribute('aria-label', cfg.ariaLabel());
    const id = cfg.name;
    win.innerHTML = '<div class="tw-tb">' + LIGHTS + '<span class="t"></span></div>' +
      '<div class="tw-in"><label for="' + id + '-q"></label><input id="' + id + '-q" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-controls="' + id +
      '-list" aria-expanded="true" placeholder="' + esc(cfg.placeholder()) + '"></div>' +
      (cfg.above ? cfg.above() : '') +
      '<div class="tw-list" id="' + id + '-list" role="listbox"></div>' +
      (cfg.below ? cfg.below() : '') +
      '<div class="tw-ft">' + cfg.footer() + '<span class="n"></span></div>';
    tw.input = win.querySelector('input')!;
    tw.list = win.querySelector('.tw-list')!;
    const input = tw.input;
    input.addEventListener('input', () => {
      tw.sel = 0;
      refresh();
      cfg.onInput?.(tw);
      paint(true);
    });
    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (cfg.onKey?.(e, tw)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); tw.sel = Math.min(tw.count - 1, tw.sel + 1); paint(true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); tw.sel = Math.max(0, tw.sel - 1); paint(true); }
      else if (e.key === 'Enter') { e.preventDefault(); cfg.go(tw.sel, tw); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    });
    tw.list.addEventListener('click', (e) => {
      const r = (e.target as Element).closest<HTMLElement>('[data-i]');
      if (r) cfg.go(+r.dataset.i!, tw);
    });
    tw.list.addEventListener('mousemove', (e) => {
      const r = (e.target as Element).closest<HTMLElement>('[data-i]');
      if (r && +r.dataset.i! !== tw.sel) { tw.sel = +r.dataset.i!; paint(); }
    });
    cfg.onRender?.(tw);
    if (tw.isOpen()) { setLabel(); refresh(); fitTitle(); }
  }

  render();
  ps.addEventListener('click', () => open());
  scrim.addEventListener('click', () => close());
  addEventListener('resize', () => { if (tw.isOpen()) fitTitle(); });
  addEventListener('keydown', (e) => {
    const openNow = tw.isOpen();
    const ae = document.activeElement as HTMLElement | null;
    const typingInField = !!ae && (/INPUT|TEXTAREA|SELECT/.test(ae.tagName) || ae.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); e.stopPropagation(); openNow ? close() : open();
    } else if (e.key === 'Escape' && openNow) close();
    else if (e.key === '/' && !openNow && !typingInField && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); open(); }
  }, true);

  return tw;
}
