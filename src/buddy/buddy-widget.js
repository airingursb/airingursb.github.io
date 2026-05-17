// Buddy System - DOM widget
// Renders an ASCII pet in the bottom-right corner of the blog

import {
  roll, getVisitorId,
  RARITY_COLORS, RARITY_STARS, RARITY_LABELS,
  SPECIES_LABELS, STAT_NAMES,
} from './buddy.js'
import { renderSprite, spriteFrameCount } from './sprites.js'

const TICK_MS = 500
const BUBBLE_MESSAGES = [
  '你好呀~', '在看什么文章？', '摸摸我嘛~', '...zzZ',
  '今天天气不错！', '(｡◕‿◕｡)', '要喝杯咖啡吗？', '嘿嘿~',
  '加油写代码！', '✨ 闪闪发光 ✨', '我饿了...', '陪你看文章~',
  '(*´▽｀*)', '这篇文章好长啊', '休息一下吧~', '嗯哼~',
]
const BUBBLE_INTERVAL_MIN = 20000
const BUBBLE_INTERVAL_MAX = 45000
const BUBBLE_DURATION = 4000

let buddy = null
let frame = 0
let animTimer = null
let bubbleTimer = null
let cardVisible = false

function init() {
  const visitorId = getVisitorId()
  buddy = roll(visitorId)

  const container = document.createElement('div')
  container.id = 'buddy-container'
  container.className = `buddy rarity-${buddy.rarity}`
  if (buddy.shiny) container.classList.add('buddy-shiny')

  container.innerHTML = `
    <div class="buddy-bubble" id="buddyBubble"></div>
    <pre class="buddy-sprite" id="buddySprite"></pre>
    <div class="buddy-card" id="buddyCard">
      <div class="buddy-card-header">
        <span class="buddy-card-species"></span>
        <span class="buddy-card-rarity"></span>
      </div>
      <div class="buddy-card-stars"></div>
      <div class="buddy-card-stats"></div>
    </div>
  `
  document.body.appendChild(container)

  const sprite = document.getElementById('buddySprite')
  const card = document.getElementById('buddyCard')

  // Render first frame
  updateSprite(sprite)

  // Fill card
  fillCard()

  // Idle animation
  animTimer = setInterval(() => {
    frame = (frame + 1) % spriteFrameCount(buddy.species)
    updateSprite(sprite)
  }, TICK_MS)

  // Click to toggle card
  sprite.addEventListener('click', (e) => {
    e.stopPropagation()
    cardVisible = !cardVisible
    card.classList.toggle('visible', cardVisible)
  })

  // Close card when clicking elsewhere
  document.addEventListener('click', () => {
    if (cardVisible) {
      cardVisible = false
      card.classList.remove('visible')
    }
  })
  card.addEventListener('click', (e) => e.stopPropagation())

  // Random bubbles
  scheduleBubble()
}

function updateSprite(el) {
  const lines = renderSprite(buddy, frame)
  el.textContent = lines.join('\n')
}

function fillCard() {
  const species = document.querySelector('.buddy-card-species')
  const rarity = document.querySelector('.buddy-card-rarity')
  const stars = document.querySelector('.buddy-card-stars')
  const statsEl = document.querySelector('.buddy-card-stats')

  const label = SPECIES_LABELS[buddy.species] || buddy.species
  species.textContent = label
  rarity.textContent = RARITY_LABELS[buddy.rarity]
  rarity.style.color = RARITY_COLORS[buddy.rarity]
  stars.textContent = RARITY_STARS[buddy.rarity]
  stars.style.color = RARITY_COLORS[buddy.rarity]

  const statLabels = {
    DEBUGGING: '调试', PATIENCE: '耐心', CHAOS: '混沌', WISDOM: '智慧', SNARK: '毒舌',
  }
  statsEl.innerHTML = STAT_NAMES.map(name => {
    const val = buddy.stats[name]
    return `
      <div class="buddy-stat">
        <span class="buddy-stat-name">${statLabels[name]}</span>
        <div class="buddy-stat-bar">
          <div class="buddy-stat-fill" style="width:${val}%;background:${RARITY_COLORS[buddy.rarity]}"></div>
        </div>
        <span class="buddy-stat-val">${val}</span>
      </div>
    `
  }).join('')

  if (buddy.hat !== 'none') {
    const hatLabels = {
      crown: '皇冠', tophat: '高帽', propeller: '螺旋桨帽', halo: '光环',
      wizard: '巫师帽', beanie: '毛线帽', tinyduck: '小鸭鸭',
    }
    const hatEl = document.createElement('div')
    hatEl.className = 'buddy-card-hat'
    hatEl.textContent = `🎩 ${hatLabels[buddy.hat] || buddy.hat}`
    statsEl.parentNode.insertBefore(hatEl, statsEl)
  }
}

function showBubble(text) {
  const bubble = document.getElementById('buddyBubble')
  bubble.textContent = text
  bubble.classList.add('visible')
  setTimeout(() => bubble.classList.remove('visible'), BUBBLE_DURATION)
}

function scheduleBubble() {
  const delay = BUBBLE_INTERVAL_MIN + Math.random() * (BUBBLE_INTERVAL_MAX - BUBBLE_INTERVAL_MIN)
  bubbleTimer = setTimeout(() => {
    const msg = BUBBLE_MESSAGES[Math.floor(Math.random() * BUBBLE_MESSAGES.length)]
    showBubble(msg)
    scheduleBubble()
  }, delay)
}

// Only init on blog/post pages, not homepage
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
