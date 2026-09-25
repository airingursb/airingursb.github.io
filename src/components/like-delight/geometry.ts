type Point = { readonly x: number; readonly y: number };

export function heartPosition(start: Point, end: Point, progress: number): Point {
  const t = Math.max(0, Math.min(1, progress));
  const lift = Math.min(110, Math.max(36, Math.abs(end.x - start.x) * .18));
  const control = { x: start.x + (end.x - start.x) * .48, y: Math.min(start.y, end.y) - lift };
  return {
    x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x,
    y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y,
  };
}

export function rectangleVisible(rect: { readonly top: number; readonly bottom: number; readonly left: number; readonly right: number; readonly width: number; readonly height: number }, width: number, height: number): boolean {
  return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= height && rect.left >= 0 && rect.right <= width;
}
