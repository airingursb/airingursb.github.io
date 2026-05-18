// V11.7 — Beach Shell Hunt.
//
// 5×5 grid, 5 hidden shells. Player makes up to 10 reveals. Score =
// shells_found × 20 + bonus 50 if all 5 found within the click budget.

export function runShell(stage: HTMLElement, onFinish: (score: number) => void) {
  const SIZE = 5
  const SHELLS = 5
  const MAX_CLICKS = 10

  // Randomly place shells
  const shellPos = new Set<number>()
  while (shellPos.size < SHELLS) shellPos.add(Math.floor(Math.random() * SIZE * SIZE))

  let clicksLeft = MAX_CLICKS
  let found = 0
  let revealed = new Set<number>()

  stage.innerHTML = `
    <div class="mg-shell-meta">Find ${SHELLS} hidden shells. <span id="mg-shell-clicks">${MAX_CLICKS}</span> clicks left, <span id="mg-shell-found">0</span>/${SHELLS} found.</div>
    <div id="mg-shell-grid" class="mg-shell-grid" style="grid-template-columns: repeat(${SIZE}, 1fr);"></div>
  `
  const grid = stage.querySelector('#mg-shell-grid') as HTMLElement
  const clicksEl = stage.querySelector('#mg-shell-clicks') as HTMLElement
  const foundEl = stage.querySelector('#mg-shell-found') as HTMLElement

  function finish() {
    const score = found * 20 + (found === SHELLS ? 50 : 0)
    onFinish(score)
  }

  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement('button')
    cell.className = 'mg-shell-cell'
    cell.type = 'button'
    cell.addEventListener('click', () => {
      if (clicksLeft <= 0 || revealed.has(i)) return
      revealed.add(i)
      clicksLeft--
      if (shellPos.has(i)) {
        found++
        cell.textContent = '🐚'
        cell.classList.add('hit')
        foundEl.textContent = String(found)
      } else {
        cell.textContent = '·'
        cell.classList.add('miss')
      }
      clicksEl.textContent = String(clicksLeft)
      if (clicksLeft <= 0 || found === SHELLS) {
        setTimeout(finish, 700)
      }
    })
    grid.appendChild(cell)
  }
}
