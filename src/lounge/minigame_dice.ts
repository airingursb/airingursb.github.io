// V11.6 — Lobby Dice mini-game.
//
// 2d6, click "Roll" → animated reveal → score = sum. Player can re-roll
// twice per session (best of 3 wins). Encourages a quick high-stakes feel.

export function runDice(stage: HTMLElement, onFinish: (score: number) => void) {
  stage.innerHTML = `
    <div class="mg-dice-board">
      <div class="mg-dice" id="mg-dice-a">?</div>
      <div class="mg-dice" id="mg-dice-b">?</div>
    </div>
    <div class="mg-dice-meta">Rolls left: <span id="mg-rolls">3</span></div>
    <div class="mg-dice-best">Best so far: <strong id="mg-current-best">0</strong></div>
    <button type="button" id="mg-roll" class="mg-primary">Roll 🎲</button>
  `
  const dA = stage.querySelector('#mg-dice-a') as HTMLElement
  const dB = stage.querySelector('#mg-dice-b') as HTMLElement
  const rolls = stage.querySelector('#mg-rolls') as HTMLElement
  const curBest = stage.querySelector('#mg-current-best') as HTMLElement
  const btn = stage.querySelector('#mg-roll') as HTMLButtonElement
  let rollsLeft = 3
  let best = 0

  const animate = (el: HTMLElement) => new Promise<number>(resolve => {
    let t = 0
    const tick = () => {
      el.textContent = String(1 + Math.floor(Math.random() * 6))
      t += 1
      if (t < 12) requestAnimationFrame(tick)
      else {
        const final = 1 + Math.floor(Math.random() * 6)
        el.textContent = String(final)
        resolve(final)
      }
    }
    tick()
  })

  btn.addEventListener('click', async () => {
    if (rollsLeft <= 0) return
    btn.disabled = true
    const [a, b] = await Promise.all([animate(dA), animate(dB)])
    const total = a + b
    if (total > best) { best = total; curBest.textContent = String(best) }
    rollsLeft--
    rolls.textContent = String(rollsLeft)
    if (rollsLeft <= 0) {
      btn.textContent = 'Done'
      btn.disabled = false
      btn.onclick = () => onFinish(best)
    } else {
      btn.disabled = false
    }
  })
}
