// V11.7 — Grove Garden Tending.
//
// 4 plant tiles. Every 1.5-3s a random plant calls out a need (💧 / ☀️
// / ✂️). Player clicks the matching action button on that plant before
// a 3-second timeout. 30s game. Score = correct - wrong.

const ACTIONS = ['💧', '☀️', '✂️'] as const
type Action = typeof ACTIONS[number]

export function runGarden(stage: HTMLElement, onFinish: (score: number) => void) {
  const PLANT_COUNT = 4
  const DURATION_MS = 30_000
  const TIMEOUT_PER_NEED = 3000

  stage.innerHTML = `
    <div class="mg-garden-meta">Tend each plant before its need expires. <span id="mg-garden-time">30</span>s left · score <strong id="mg-garden-score">0</strong></div>
    <div id="mg-garden-row" class="mg-garden-row"></div>
  `
  const row = stage.querySelector('#mg-garden-row') as HTMLElement
  const timeEl = stage.querySelector('#mg-garden-time') as HTMLElement
  const scoreEl = stage.querySelector('#mg-garden-score') as HTMLElement

  let score = 0
  let running = true
  const startedAt = performance.now()

  type Plant = {
    el: HTMLElement
    needEl: HTMLElement
    btns: HTMLButtonElement[]
    currentNeed: Action | null
    needSince: number
  }
  const plants: Plant[] = []
  for (let i = 0; i < PLANT_COUNT; i++) {
    const wrap = document.createElement('div')
    wrap.className = 'mg-garden-plant'
    wrap.innerHTML = `
      <div class="mg-garden-icon">🌱</div>
      <div class="mg-garden-need"></div>
      <div class="mg-garden-actions">
        ${ACTIONS.map(a => `<button type="button" class="mg-garden-act" data-act="${a}">${a}</button>`).join('')}
      </div>
    `
    row.appendChild(wrap)
    const plant: Plant = {
      el: wrap,
      needEl: wrap.querySelector('.mg-garden-need') as HTMLElement,
      btns: Array.from(wrap.querySelectorAll('.mg-garden-act')) as HTMLButtonElement[],
      currentNeed: null,
      needSince: 0
    }
    for (const b of plant.btns) {
      b.addEventListener('click', () => onAction(plant, b.dataset.act as Action))
    }
    plants.push(plant)
  }

  function setNeed(p: Plant, n: Action | null) {
    p.currentNeed = n
    p.needSince = performance.now()
    if (n) { p.needEl.textContent = n; p.el.classList.add('needing') }
    else   { p.needEl.textContent = '';  p.el.classList.remove('needing') }
  }

  function onAction(p: Plant, a: Action) {
    if (!running) return
    if (p.currentNeed === a) { score++; flash(p.el, 'mg-garden-correct') }
    else                      { score--; flash(p.el, 'mg-garden-wrong') }
    scoreEl.textContent = String(score)
    setNeed(p, null)
  }

  function flash(el: HTMLElement, cls: string) {
    el.classList.add(cls)
    setTimeout(() => el.classList.remove(cls), 350)
  }

  function tick() {
    if (!running) return
    const elapsed = performance.now() - startedAt
    if (elapsed >= DURATION_MS) { running = false; onFinish(Math.max(0, score)); return }
    timeEl.textContent = Math.ceil((DURATION_MS - elapsed) / 1000).toString()
    // Time-out unmet needs
    for (const p of plants) {
      if (p.currentNeed && performance.now() - p.needSince > TIMEOUT_PER_NEED) {
        score--
        flash(p.el, 'mg-garden-wrong')
        scoreEl.textContent = String(score)
        setNeed(p, null)
      }
    }
    // Randomly assign new needs (~2/sec across the row)
    if (Math.random() < 0.06) {
      const idle = plants.filter(p => !p.currentNeed)
      if (idle.length > 0) {
        const p = idle[Math.floor(Math.random() * idle.length)]
        const need = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
        setNeed(p, need)
      }
    }
    requestAnimationFrame(tick)
  }
  tick()
}
