// SHU-733 · Cross-component state. Tiny zustand store.

import { create } from 'zustand'

export type Stage =
  | 'intro'        // tutorial step ① — "你跟着 Mochi 走进林子"
  | 'approach'    // ② walk toward Mochi (auto-advance when within 8m)
  | 'beside'      // ③ walk to sitting stone with Mochi
  | 'seated'      // ④ sit + chat
  | 'leaving'     // ⑤ stand up + walk to exit
  | 'done'        // exit posted, parent should unmount iframe

interface State {
  stage: Stage
  setStage: (s: Stage) => void

  // Player's chosen species (from 2D Nook localStorage, passed via query param)
  species: string
  setSpecies: (s: string) => void

  // Display name (for nameplates / peer rendering)
  displayName: string
  setDisplayName: (n: string) => void

  // Dialogue history with Mochi (in-3D chat)
  messages: Array<{ role: 'user' | 'assistant'; content: string; ts: number }>
  appendMessage: (m: { role: 'user' | 'assistant'; content: string }) => void

  // Multiplayer peers (id → position + species). Filled by ws.ts.
  peers: Record<string, { id: string; species: string; displayName?: string; x: number; y: number; z: number; rotY: number }>
}

export const useGroveStore = create<State>((set) => ({
  stage: 'intro',
  setStage: (s) => set({ stage: s }),

  species: 'bear',
  setSpecies: (s) => set({ species: s }),

  displayName: '',
  setDisplayName: (n) => set({ displayName: n }),

  messages: [],
  appendMessage: (m) =>
    set((st) => ({ messages: [...st.messages, { ...m, ts: Date.now() }] })),

  peers: {},
}))

/**
 * Post a typed message to the parent window (the 2D Nook iframe host).
 * Falls back to console if not in an iframe (when accessed directly).
 */
export function postToParent(msg: { type: 'ready' | 'exit'; quest_completed?: boolean }) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(msg, window.location.origin)
  } else {
    console.log('[grove3d] no parent window, would have posted:', msg)
  }
}
