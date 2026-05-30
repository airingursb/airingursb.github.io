// Tiny in-memory localStorage shim for Node tests of browser modules.
// Each test file should `import './_shim.mjs'` at the top before importing
// any src/lounge module that touches localStorage.

class MemoryStorage {
  constructor() { this._m = new Map() }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null }
  setItem(k, v) { this._m.set(String(k), String(v)) }
  removeItem(k) { this._m.delete(k) }
  clear() { this._m.clear() }
  key(i) { return [...this._m.keys()][i] ?? null }
  get length() { return this._m.size }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new MemoryStorage()
}

/** Reset the shim between tests. Call inside `beforeEach`. */
export function resetLocalStorage() {
  globalThis.localStorage.clear()
}
