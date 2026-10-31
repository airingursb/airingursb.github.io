/**
 * Reading ticket as a PNG (save / system share): the ticket redrawn on a
 * canvas in the same layout and in the current theme's colours. The "tear off
 * · share" line is page chrome and is left out.
 */
import { barcode, type TicketView } from "./reading-ticket.ts";

export type TicketPalette = {
  readonly page: string;
  readonly paper: string;
  readonly ink: string;
  readonly mute: string;
  readonly rule: string;
  readonly red: string;
  readonly serif: string;
  readonly mono: string;
};

export type TicketLabels = {
  readonly title: string;
  readonly brand: string;
  readonly stub: string;
  readonly cells: readonly (readonly [string, string])[];
};

const W = 760;
const H = 330;
const MAIN = 556;
const PERF = 14;
const SCALE = 2;
const PAD = 24;

export function drawTicket(view: TicketView, labels: TicketLabels, url: string, c: TicketPalette): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = (W + 48) * SCALE;
  canvas.height = (H + 48) * SCALE;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas 2D unavailable");
  g.scale(SCALE, SCALE);
  g.fillStyle = c.page;
  g.fillRect(0, 0, W + 48, H + 48);
  g.translate(24, 24);

  const rounded = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  const text = (s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left") => {
    g.font = font;
    g.fillStyle = color;
    g.textAlign = align;
    g.textBaseline = "alphabetic";
    g.fillText(s, x, y);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, dashed = false) => {
    g.save();
    g.strokeStyle = c.rule;
    g.lineWidth = 1;
    if (dashed) g.setLineDash([4, 3]);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    g.restore();
  };
  const mono = (weight: number, size: number) => `${weight} ${size}px ${c.mono}`;
  const serif = (size: number) => `700 ${size}px ${c.serif}`;

  g.save();
  g.shadowColor = "rgba(0,0,0,.28)";
  g.shadowBlur = 18;
  g.shadowOffsetY = 8;
  g.fillStyle = c.paper;
  rounded(0, 0, W, H, 8);
  g.fill();
  g.restore();

  // Perforation between ticket and stub
  g.fillStyle = c.mute;
  for (let y = 12; y < H - 12; y += 9) g.fillRect(MAIN + PERF / 2 - 0.75, y, 1.5, 4.5);

  text(labels.brand, PAD, 34, mono(600, 11), c.mute);
  text(view.admit, MAIN - PAD, 34, mono(600, 11), c.mute, "right");
  line(PAD, 44, MAIN - PAD, 44);

  // Title: wrapped by width, two lines at most
  g.font = serif(24);
  let lines: string[] = [];
  let current = "";
  for (const ch of labels.title) {
    if (g.measureText(current + ch).width > MAIN - PAD * 2) { lines.push(current); current = ch; } else current += ch;
  }
  if (current) lines.push(current);
  if (lines.length > 2) { lines = lines.slice(0, 2); lines[1] = `${lines[1].slice(0, -1)}…`; }
  lines.forEach((l, i) => text(l, PAD, 80 + i * 32, serif(24), c.ink));

  const gridTop = 80 + lines.length * 32 + 4;
  line(PAD, gridTop, MAIN - PAD, gridTop, true);
  const column = (MAIN - PAD * 2) / 3;
  labels.cells.forEach(([label, value], i) => {
    const x = PAD + (i % 3) * column;
    const y = gridTop + 24 + Math.floor(i / 3) * 44;
    text(label, x, y, mono(500, 11), c.mute);
    text(value, x, y + 20, mono(700, 15), c.ink);
  });
  const fineTop = gridTop + 24 + Math.ceil(labels.cells.length / 3) * 44 - 6;
  line(PAD, fineTop, MAIN - PAD, fineTop, true);
  if (view.fine) text(view.fine, PAD, fineTop + 22, mono(500, 11), c.mute);
  text(url.replace(/^https?:\/\//, ""), PAD, H - 18, mono(600, 11), c.mute);

  // Stub
  const stubLeft = MAIN + PERF;
  const center = stubLeft + (W - stubLeft) / 2;
  text(labels.stub, stubLeft + 16, 34, mono(600, 11), c.mute);
  if (view.seatNo) text(view.seatNo, W - 16, 34, mono(600, 11), c.mute, "right");
  line(stubLeft + 16, 44, W - 16, 44);
  g.font = serif(46);
  const bigWidth = g.measureText(view.sumBig).width;
  g.font = serif(22);
  const smallWidth = g.measureText(view.sumSmall).width;
  const start = center - (bigWidth + smallWidth) / 2;
  text(view.sumBig, start, 112, serif(46), c.ink);
  text(view.sumSmall, start + bigWidth, 112, serif(22), c.mute);
  text(view.sumState, center, 136, mono(600, 11), c.mute, "center");
  text(view.time, center, 154, mono(500, 12), c.mute, "center");
  if (!view.skim) {
    const left = stubLeft + 18;
    const width = W - 16 - left;
    const bars = barcode(view.code, 31);
    const total = bars.reduce((a, b) => a + b, 0);
    let x = left;
    g.fillStyle = c.ink;
    bars.forEach((w, i) => {
      const bw = (w / total) * width;
      if (i % 2 === 0) g.fillRect(x, H - 78, bw, 40);
      x += bw;
    });
    text(view.code, center, H - 22, mono(500, 10), c.mute, "center");
  }
  // Echo stamp: above-right of the section count, tilted and faint, clear of digits and barcode.
  if (view.echo) {
    g.save();
    g.translate(W - 38, 84);
    g.rotate((-14 * Math.PI) / 180);
    g.strokeStyle = c.red;
    g.lineWidth = 1.8;
    g.globalAlpha = 0.62;
    g.beginPath();
    g.arc(0, 0, 22, 0, Math.PI * 2);
    g.stroke();
    text(view.echo.likes, 0, 1, mono(700, 11), c.red, "center");
    text(view.echo.date, 0, 13, mono(600, 7), c.red, "center");
    g.restore();
  }
  return canvas;
}

export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
