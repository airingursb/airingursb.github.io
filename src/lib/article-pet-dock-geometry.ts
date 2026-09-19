type SpriteBox = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
};

export function petDockTransform(from: SpriteBox, to: SpriteBox): string {
  return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`;
}
