// V11.6 — Mini-game overlay UI. Renders the picker + dispatches to each
// game's render function. Each game writes its own DOM into the shared
// stage element + calls finishGame(score) when done.

import { MINIGAMES, recordScore, getBestScore } from './minigames'
import { awardShells } from './shells'
import { runDice } from './minigame_dice'
import { runRhythm } from './minigame_rhythm'
import { runCook } from './minigame_cook'
import { runWord } from './minigame_word'
import { runShell } from './minigame_shell'
import { runGarden } from './minigame_garden'

let overlayEl: HTMLElement | null = null
let titleEl: HTMLElement | null = null
let blurbEl: HTMLElement | null = null
let stageEl: HTMLElement | null = null
let pickerEl: HTMLElement | null = null
let backBtnEl: HTMLElement | null = null
let closeBtnEl: HTMLElement | null = null
let openBtnEl: HTMLElement | null = null
let currentGameId: string | null = null

function ensure(): boolean {
  if (overlayEl) return true
  overlayEl   = document.getElementById('lounge-minigame-overlay')
  titleEl     = document.getElementById('lounge-minigame-title')
  blurbEl     = document.getElementById('lounge-minigame-blurb')
  stageEl     = document.getElementById('lounge-minigame-stage')
  pickerEl    = document.getElementById('lounge-minigame-picker')
  backBtnEl   = document.getElementById('lounge-minigame-back')
  closeBtnEl  = document.getElementById('lounge-minigame-close')
  openBtnEl   = document.getElementById('lounge-minigame-btn')
  if (!overlayEl) return false
  closeBtnEl?.addEventListener('click', () => hide())
  backBtnEl?.addEventListener('click', () => showPicker())
  openBtnEl?.addEventListener('click', () => toggle())
  return true
}

export function toggle() {
  if (!ensure() || !overlayEl) return
  if (overlayEl.hidden) { showPicker(); overlayEl.hidden = false }
  else hide()
}

export function hide() {
  if (!ensure() || !overlayEl) return
  overlayEl.hidden = true
  if (stageEl) stageEl.innerHTML = ''
  currentGameId = null
}

function showPicker() {
  if (!ensure() || !overlayEl || !pickerEl || !stageEl || !titleEl || !blurbEl) return
  overlayEl.hidden = false
  pickerEl.hidden = false
  stageEl.innerHTML = ''
  if (backBtnEl) backBtnEl.hidden = true
  titleEl.textContent = '🎮 Mini-games'
  blurbEl.textContent = 'Pick one. Top scores rewarded in shells.'
  pickerEl.innerHTML = ''
  for (const def of MINIGAMES) {
    const { best, today } = getBestScore(def.id)
    const tile = document.createElement('button')
    tile.className = 'mg-tile'
    tile.type = 'button'
    tile.innerHTML = `
      <span class="mg-emoji">${def.emoji}</span>
      <div class="mg-body">
        <div class="mg-name">${def.name}</div>
        <div class="mg-blurb">${def.blurb}</div>
        <div class="mg-meta">${def.bestScoreLabel}: ${best} · today: ${today}</div>
      </div>
    `
    tile.addEventListener('click', () => startGame(def.id))
    pickerEl.appendChild(tile)
  }
}

function startGame(id: string) {
  if (!ensure() || !pickerEl || !stageEl || !titleEl || !blurbEl) return
  const def = MINIGAMES.find(m => m.id === id)
  if (!def) return
  currentGameId = id
  pickerEl.hidden = true
  stageEl.innerHTML = ''
  if (backBtnEl) backBtnEl.hidden = false
  titleEl.textContent = `${def.emoji} ${def.name}`
  blurbEl.textContent = def.blurb
  const onFinish = (score: number) => finishGame(id, score)
  if (id === 'dice')   runDice(stageEl, onFinish)
  if (id === 'rhythm') runRhythm(stageEl, onFinish)
  if (id === 'cook')   runCook(stageEl, onFinish)
  if (id === 'word')   runWord(stageEl, onFinish)
  if (id === 'shell')  runShell(stageEl, onFinish)
  if (id === 'garden') runGarden(stageEl, onFinish)
}

function finishGame(id: string, score: number) {
  const { newBest, reward } = recordScore(id, score)
  if (reward > 0) awardShells(reward)
  if (!stageEl) return
  // Show a results card
  const card = document.createElement('div')
  card.className = 'mg-results'
  card.innerHTML = `
    <div class="mg-results-score">Score: <strong>${score}</strong></div>
    ${newBest ? '<div class="mg-results-best">🏆 New best!</div>' : ''}
    ${reward > 0 ? `<div class="mg-results-reward">🐚 +${reward} shells</div>` : ''}
    <div class="mg-results-actions">
      <button type="button" id="mg-replay">Play again</button>
      <button type="button" id="mg-back">Back</button>
    </div>
  `
  stageEl.appendChild(card)
  document.getElementById('mg-replay')?.addEventListener('click', () => startGame(id))
  document.getElementById('mg-back')?.addEventListener('click', () => showPicker())
}

if (typeof document !== 'undefined') {
  const init = () => ensure()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
}
