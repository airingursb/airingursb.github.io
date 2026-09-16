export type WindClip = 'gust' | 'paperweight' | 'window';
export type WindChoice = Exclude<WindClip, 'gust'>;
export type WindSnapshot = {
  readonly clip: WindClip;
  readonly frame: number;
  readonly resting: boolean;
};

export const WIND_FRAMES = 180;
export const WIND_FPS = 12;
export const WIND_CHOICE_FRAME = 72;
const IDLE_START = { gust: 166, paperweight: 151, window: 150 } as const;
const IDLE_HOLD_FRAMES = 36;

export class WindTimeline {
  private clip: WindClip = 'gust';
  private elapsed = 0;
  private choice: WindChoice | null = null;
  private resting = false;
  private idleElapsed = 0;

  snapshot(): WindSnapshot {
    const last = WIND_FRAMES - 1;
    const span = last - IDLE_START[this.clip];
    const phase = Math.floor(this.idleElapsed * WIND_FPS / 1000) % (span * 2 + IDLE_HOLD_FRAMES);
    const idleFrame = last - Math.min(phase, span) + Math.max(0, phase - span - IDLE_HOLD_FRAMES);
    return {
      clip: this.clip,
      frame: this.resting ? idleFrame : Math.min(last, Math.floor(this.elapsed * WIND_FPS / 1000)),
      resting: this.resting,
    };
  }

  choose(choice: WindChoice) {
    if (this.resting) {
      const opening = this.clip === 'window' && choice === 'window';
      this.clip = 'gust';
      this.elapsed = 0;
      this.idleElapsed = 0;
      this.resting = false;
      this.choice = opening ? null : choice;
      return;
    }
    if (this.clip === 'gust') this.choice = choice;
  }

  advance(milliseconds: number) {
    if (this.resting) {
      this.idleElapsed += Math.max(0, milliseconds);
      return;
    }
    this.elapsed += Math.max(0, milliseconds);
    if (this.clip === 'gust' && this.choice && this.snapshot().frame >= WIND_CHOICE_FRAME) {
      this.clip = this.choice;
      this.choice = null;
      this.elapsed = 0;
    }
    this.resting = this.elapsed >= WIND_FRAMES / WIND_FPS * 1000;
    if (this.resting) this.idleElapsed = this.elapsed - WIND_FRAMES / WIND_FPS * 1000;
  }
}
