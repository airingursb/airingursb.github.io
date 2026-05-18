// V11.6 — DJ Rhythm mini-game.
//
// 8 notes drop down 4 lanes (matching the existing jam pad pattern). Tap
// the matching key (or click the lane) when the note hits the bottom line.
// Score is accuracy% (0-100). Total time ~12s.

const LANE_KEYS = ['1', '2', '3', '4']

export function runRhythm(stage: HTMLElement, onFinish: (score: number) => void) {
  stage.innerHTML = `
    <div class="mg-rhythm-meta">Tap 1/2/3/4 (or the lane) when a note hits the line.</div>
    <div class="mg-rhythm-board">
      ${[0,1,2,3].map(i => `
        <div class="mg-rh-lane" data-lane="${i}">
          <div class="mg-rh-key">${LANE_KEYS[i]}</div>
        </div>
      `).join('')}
    </div>
    <div class="mg-rhythm-stats">Hits: <span id="mg-rh-hits">0</span> / <span id="mg-rh-total">0</span></div>
    <button type="button" id="mg-rh-start" class="mg-primary">Start</button>
  `

  const lanes = Array.from(stage.querySelectorAll('.mg-rh-lane')) as HTMLElement[]
  const hitsEl = stage.querySelector('#mg-rh-hits') as HTMLElement
  const totalEl = stage.querySelector('#mg-rh-total') as HTMLElement
  const startBtn = stage.querySelector('#mg-rh-start') as HTMLButtonElement

  // Pre-generate 8 notes, evenly spaced
  const NOTE_COUNT = 8
  const SPACING = 900     // ms between notes
  const FALL_DURATION = 1500  // time from spawn to hit line
  const HIT_WINDOW = 240  // ±ms

  let activeNotes: Array<{ lane: number; spawnAt: number; el: HTMLElement; hit: boolean }> = []
  let hits = 0
  let started = false
  totalEl.textContent = String(NOTE_COUNT)

  function tryHit(laneIdx: number) {
    const now = performance.now()
    for (const n of activeNotes) {
      if (n.hit || n.lane !== laneIdx) continue
      const targetAt = n.spawnAt + FALL_DURATION
      if (Math.abs(now - targetAt) <= HIT_WINDOW) {
        n.hit = true
        n.el.classList.add('mg-rh-hit')
        hits++
        hitsEl.textContent = String(hits)
        return
      }
    }
  }

  for (const lane of lanes) {
    lane.addEventListener('click', () => tryHit(Number(lane.dataset.lane)))
    lane.addEventListener('touchstart', (e) => { e.preventDefault(); tryHit(Number(lane.dataset.lane)) }, { passive: false })
  }
  const onKey = (e: KeyboardEvent) => {
    const idx = LANE_KEYS.indexOf(e.key)
    if (idx >= 0) tryHit(idx)
  }
  window.addEventListener('keydown', onKey)

  startBtn.addEventListener('click', () => {
    if (started) return
    started = true
    startBtn.disabled = true
    startBtn.textContent = 'Go!'
    const t0 = performance.now()
    for (let i = 0; i < NOTE_COUNT; i++) {
      setTimeout(() => spawnNote(t0 + i * SPACING), i * SPACING)
    }
    // Finish window — after last note's hit time + a small buffer
    setTimeout(() => {
      window.removeEventListener('keydown', onKey)
      const accuracy = Math.round((hits / NOTE_COUNT) * 100)
      onFinish(accuracy)
    }, NOTE_COUNT * SPACING + FALL_DURATION + 400)
  })

  function spawnNote(scheduledSpawn: number) {
    const lane = Math.floor(Math.random() * 4)
    const note = document.createElement('div')
    note.className = 'mg-rh-note'
    note.style.animationDuration = FALL_DURATION + 'ms'
    lanes[lane].appendChild(note)
    activeNotes.push({ lane, spawnAt: scheduledSpawn, el: note, hit: false })
    setTimeout(() => {
      note.classList.add('mg-rh-fade')
      setTimeout(() => note.remove(), 400)
    }, FALL_DURATION + HIT_WINDOW)
  }
}
