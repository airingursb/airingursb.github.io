export class PetInteraction {
  private first = 0;
  private count = 0;
  private cooldown = 0;

  next(now: number): 'pet' | 'shy' | null {
    if (now < this.cooldown) return null;
    if (!this.count || now - this.first > 5000) {
      this.first = now;
      this.count = 0;
    }
    if (++this.count < 3) return 'pet';
    this.count = 0;
    this.cooldown = now + 8000;
    return 'shy';
  }

  reset() {
    this.count = 0;
    this.cooldown = 0;
  }
}
