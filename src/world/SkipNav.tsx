// V2 a11y final: zone hitboxes live inside a Three.js scene — they
// aren't keyboard-focusable and screen readers can't reach them.
// This component is a visually-hidden landmark nav (DOM, AT-reachable)
// that fires the same 'world-zone-click' event as a hitbox press,
// so AT/keyboard users can activate any zone without sighted input.
//
// Visible only to AT (sr-only pattern: clipped 1×1 box). If the user
// Tab-focuses into the nav, the focused button visually appears
// (focus-visible reveal) so sighted keyboard users see what's selected.

import { ZONES } from './zones'
import { emit } from './events'

export default function SkipNav() {
  return (
    <nav className="world-skip-nav" aria-label="木屋岛区域导航">
      {/* Visual-only label. Was <h2> originally but /world/ has no
          <h1>, so an h2 polluted the heading hierarchy (AT users
          would land on h2 with no parent). The <nav>'s aria-label
          already provides the screen-reader context. */}
      <div className="world-skip-nav-title" aria-hidden="true">区域</div>
      <ul>
        {ZONES.map((z) => (
          <li key={z.kind}>
            <button
              type="button"
              onClick={() => emit('world-zone-click', { kind: z.kind })}
            >
              {z.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
