// V11.7 — Library Word Puzzle.
//
// 5 rounds: a 5-letter word is shown with one letter replaced by '_';
// player picks the correct fill from 4 options. Score = correct × 20.

const WORDS = [
  'BLOOM', 'GROVE', 'SHORE', 'LIGHT', 'DREAM',
  'STILL', 'BRAVE', 'CRAFT', 'PEACE', 'STEAM',
  'EMBER', 'WHARF', 'BRINE', 'CHIME', 'AROMA',
  'CRISP', 'PRISM', 'QUILL', 'SPARK', 'TRUST'
]
const ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function runWord(stage: HTMLElement, onFinish: (score: number) => void) {
  const ROUNDS = 5
  const picks: string[] = []
  // Pick 5 random words
  const pool = [...WORDS]
  for (let i = 0; i < ROUNDS; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    picks.push(pool.splice(idx, 1)[0])
  }
  let round = 0
  let score = 0

  stage.innerHTML = `
    <div class="mg-word-meta">Round <span id="mg-word-round">1</span> / ${ROUNDS} · Score: <span id="mg-word-score">0</span></div>
    <div id="mg-word-display" class="mg-word-display"></div>
    <div id="mg-word-choices" class="mg-word-choices"></div>
  `
  const display = stage.querySelector('#mg-word-display') as HTMLElement
  const choicesEl = stage.querySelector('#mg-word-choices') as HTMLElement
  const roundEl = stage.querySelector('#mg-word-round') as HTMLElement
  const scoreEl = stage.querySelector('#mg-word-score') as HTMLElement

  function nextRound() {
    if (round >= ROUNDS) { onFinish(score); return }
    const word = picks[round]
    const blankIdx = Math.floor(Math.random() * word.length)
    const answer = word[blankIdx]
    // Display with blank
    display.textContent = word.split('').map((c: string, i: number) => i === blankIdx ? '_' : c).join(' ')
    // 4 choices: 1 correct + 3 random distractors
    const distractors = new Set<string>()
    while (distractors.size < 3) {
      const r = ALPH[Math.floor(Math.random() * 26)]
      if (r !== answer) distractors.add(r)
    }
    const opts = [answer, ...distractors]
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[opts[i], opts[j]] = [opts[j], opts[i]]
    }
    choicesEl.innerHTML = ''
    for (const o of opts) {
      const b = document.createElement('button')
      b.className = 'mg-word-choice'
      b.type = 'button'
      b.textContent = o
      b.addEventListener('click', () => {
        if (o === answer) { score += 20; b.classList.add('correct') }
        else b.classList.add('wrong')
        round++
        roundEl.textContent = String(round + 1 > ROUNDS ? ROUNDS : round + 1)
        scoreEl.textContent = String(score)
        setTimeout(nextRound, 600)
      })
      choicesEl.appendChild(b)
    }
  }
  nextRound()
}
