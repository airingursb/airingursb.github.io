export type Activity = 'typing' | 'reading' | 'sleep' | 'music';
export type ClipId = Activity | 'pet' | 'drink' | 'stretch' | 'water' | 'shy';
export type Clip = {
  readonly asset: string;
  readonly fps: number;
  readonly frameCount: number;
  readonly columns: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly holdStart: number;
  readonly holdEnd: number;
  readonly still: number;
  readonly exitFrames?: readonly number[];
};
export type Clips = Readonly<Record<ClipId, Clip>>;
export const isActivity = (id: ClipId): id is Activity =>
  id === 'typing' || id === 'reading' || id === 'sleep' || id === 'music';

export function routineActivity(hour: number, random: number): Activity {
  if (hour >= 23 || hour < 7) return random < 0.7 ? 'sleep' : 'reading';
  return random < 0.3 ? 'reading' : random < 0.6 ? 'music' : 'typing';
}

export function routineAction(hour: number, random: number): ClipId {
  if (hour >= 7 && hour < 23 && random < 0.15) return 'stretch';
  return routineActivity(hour, random);
}

export class BearTimeline {
  clip: ClipId = 'typing';
  frame = 0;
  activity: Activity = 'typing';
  phase: 'enter' | 'hold' | 'exit' | 'once' = 'hold';
  private pending: ClipId | null = null;
  private remainder = 0;

  private readonly clips: Clips;
  constructor(clips: Clips) { this.clips = clips; }

  request(id: ClipId, still = false) {
    if (isActivity(id)) this.activity = id;
    if (still) {
      this.start(id);
      this.frame = this.clips[id].still;
      this.phase = isActivity(id) ? 'hold' : 'once';
      return;
    }
    if (id === this.clip && this.phase !== 'exit') return;
    this.pending = id;
    if (this.phase === 'hold') this.exit();
  }

  settle() {
    this.request(this.activity, true);
  }

  advance(milliseconds: number) {
    this.remainder += milliseconds;
    while (true) {
      const interval = 1000 / this.clips[this.clip].fps / (this.clip === 'typing' && this.phase === 'exit' ? 2 : 1);
      if (this.remainder < interval) break;
      this.remainder -= interval;
      this.step();
    }
  }

  private start(id: ClipId) {
    this.clip = id;
    this.frame = 0;
    this.remainder = 0;
    this.pending = null;
    this.phase = id === 'typing' ? 'hold' : isActivity(id) ? 'enter' : 'once';
  }

  private exit() {
    this.phase = 'exit';
    if (this.clip !== 'typing') this.frame = this.clips[this.clip].holdEnd + 1;
  }

  private step() {
    const clip = this.clips[this.clip];
    this.frame++;
    if (this.frame >= clip.frameCount || (this.phase === 'exit' && clip.exitFrames?.includes(this.frame))) {
      this.start(this.pending ?? this.activity);
    } else if (this.phase === 'enter' && this.frame >= clip.holdStart) {
      this.phase = 'hold';
      if (this.pending) this.exit();
    } else if (this.phase === 'hold' && this.frame > clip.holdEnd) {
      this.frame = clip.holdStart;
    }
  }
}
