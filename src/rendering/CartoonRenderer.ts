// Cartoon renderer using Canvas2D with shapes, gradients, and animated effects

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { MaterialType } from '../core/Types';

const CANVAS_SIZE = 640;

export class CartoonRenderer {
  private ctx: CanvasRenderingContext2D;
  private gridWidth: number;
  private gridHeight: number;
  private cellSize: number;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement, gridWidth: number, gridHeight: number) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.cellSize = CANVAS_SIZE / gridWidth;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not get 2D context for cartoon renderer');
    }
    this.ctx = ctx;
  }

  /**
   * Deterministic hash for stable per-cell texture variation
   */
  private hash(x: number, y: number): number {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    return (h ^ (h >> 16)) >>> 0;
  }

  render(grid: Grid, _getColor: (cell: Cell) => number): void {
    this.time += 0.05;
    const ctx = this.ctx;
    const cs = this.cellSize;

    // Background: dark gradient sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
    skyGrad.addColorStop(0, '#0a0a2e');
    skyGrad.addColorStop(0.5, '#1a1a3e');
    skyGrad.addColorStop(1, '#2a1a1a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw cells
    for (let gy = 0; gy < this.gridHeight; gy++) {
      for (let gx = 0; gx < this.gridWidth; gx++) {
        const cell = grid.get(gx, gy);
        if (Cell.isEmpty(cell)) continue;

        const matId = Cell.getMaterialId(cell);
        if (matId === MaterialType.Empty) continue;

        const px = gx * cs;
        const py = gy * cs;
        const h = this.hash(gx, gy);
        const variation = (h & 0xff) / 255;

        this.drawCell(ctx, matId, px, py, cs, variation, cell);
      }
    }

    // Outline pass: draw borders where materials change
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1;
    for (let gy = 0; gy < this.gridHeight; gy++) {
      for (let gx = 0; gx < this.gridWidth; gx++) {
        const cell = grid.get(gx, gy);
        const matId = Cell.getMaterialId(cell);
        if (matId === MaterialType.Air || matId === MaterialType.Empty) continue;

        const px = gx * cs;
        const py = gy * cs;

        // Check right neighbor
        if (gx + 1 < this.gridWidth) {
          const rightMat = Cell.getMaterialId(grid.get(gx + 1, gy));
          if (rightMat !== matId && rightMat !== MaterialType.Empty) {
            ctx.beginPath();
            ctx.moveTo(px + cs, py);
            ctx.lineTo(px + cs, py + cs);
            ctx.stroke();
          }
        }

        // Check bottom neighbor
        if (gy + 1 < this.gridHeight) {
          const belowMat = Cell.getMaterialId(grid.get(gx, gy + 1));
          if (belowMat !== matId && belowMat !== MaterialType.Empty) {
            ctx.beginPath();
            ctx.moveTo(px, py + cs);
            ctx.lineTo(px + cs, py + cs);
            ctx.stroke();
          }
        }
      }
    }
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    matId: number,
    px: number,
    py: number,
    cs: number,
    variation: number,
    cell: Cell
  ): void {
    switch (matId) {
      case MaterialType.Lava:
        this.drawLava(ctx, px, py, cs, variation, cell);
        break;
      case MaterialType.Rock:
        this.drawRock(ctx, px, py, cs, variation);
        break;
      case MaterialType.Water:
        this.drawWater(ctx, px, py, cs, variation);
        break;
      case MaterialType.Gas:
        this.drawGasCell(ctx, px, py, cs, variation);
        break;
      case MaterialType.Vapor:
        this.drawVapor(ctx, px, py, cs, variation);
        break;
      case MaterialType.Air:
        // Air is transparent (already covered by sky background)
        break;
      case MaterialType.Ice:
        this.drawIce(ctx, px, py, cs, variation);
        break;
      case MaterialType.Grass:
        this.drawGrass(ctx, px, py, cs, variation);
        break;
      case MaterialType.Ash:
        this.drawAsh(ctx, px, py, cs, variation);
        break;
      default:
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(px, py, cs, cs);
        break;
    }
  }

  private drawLava(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cs: number,
    variation: number,
    cell: Cell
  ): void {
    // Base: orange-red gradient
    const temp = Cell.getTemperature(cell);
    const heat = Math.min(1, Math.max(0, (temp - 800) / 700));

    const r = Math.floor(200 + heat * 55);
    const g = Math.floor(50 + heat * 150 * variation);
    const b = Math.floor(10 + variation * 20);

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.roundRect(px + 0.2, py + 0.2, cs - 0.4, cs - 0.4, cs * 0.2);
    ctx.fill();

    // Bright center glow
    const glowIntensity = 0.3 + 0.2 * Math.sin(this.time * 3 + variation * 10);
    ctx.fillStyle = `rgba(255, 220, 50, ${glowIntensity})`;
    ctx.beginPath();
    ctx.arc(px + cs * 0.5, py + cs * 0.5, cs * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Animated bubble
    if (variation > 0.7) {
      const bubblePhase = (this.time * 2 + variation * 20) % 6.28;
      const bubbleY = py + cs * (0.3 + 0.2 * Math.sin(bubblePhase));
      ctx.fillStyle = 'rgba(255, 255, 100, 0.5)';
      ctx.beginPath();
      ctx.arc(px + cs * 0.5, bubbleY, cs * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawRock(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cs: number,
    variation: number
  ): void {
    // Brown/gray rock
    const shade = 40 + Math.floor(variation * 30);
    ctx.fillStyle = `rgb(${shade + 20},${shade + 5},${shade - 10})`;
    ctx.fillRect(px, py, cs, cs);

    // Noise dots for texture
    if (variation > 0.3) {
      const dotShade = shade + 20;
      ctx.fillStyle = `rgb(${dotShade + 10},${dotShade},${dotShade - 5})`;
      const dx = (variation * 7) % 1;
      const dy = ((variation * 13) % 1);
      ctx.fillRect(px + dx * cs * 0.5, py + dy * cs * 0.5, cs * 0.2, cs * 0.2);
    }
  }

  private drawWater(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cs: number,
    variation: number
  ): void {
    // Blue water
    const blueShift = Math.floor(variation * 30);
    ctx.fillStyle = `rgb(30,${100 + blueShift},${200 + Math.floor(variation * 55)})`;
    ctx.fillRect(px, py, cs, cs);

    // Wave pattern on top edge
    const waveOffset = Math.sin(this.time * 2 + variation * 15) * cs * 0.15;
    ctx.fillStyle = 'rgba(100, 180, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(px + cs * 0.5, py + waveOffset + cs * 0.15, cs * 0.45, cs * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGasCell(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cs: number,
    variation: number
  ): void {
    // Translucent pulsing circles
    const pulse = 0.3 + 0.15 * Math.sin(this.time * 1.5 + variation * 12);
    ctx.fillStyle = `rgba(120, 120, 100, ${pulse})`;
    ctx.beginPath();
    ctx.arc(px + cs * 0.5, py + cs * 0.5, cs * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Wisp detail
    ctx.fillStyle = `rgba(160, 160, 130, ${pulse * 0.5})`;
    ctx.beginPath();
    const offsetX = Math.sin(this.time + variation * 8) * cs * 0.15;
    ctx.arc(px + cs * 0.5 + offsetX, py + cs * 0.35, cs * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawVapor(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cs: number,
    variation: number
  ): void {
    // White translucent puffs
    const pulse = 0.25 + 0.1 * Math.sin(this.time * 2 + variation * 10);
    ctx.fillStyle = `rgba(200, 210, 230, ${pulse})`;
    ctx.beginPath();
    ctx.arc(px + cs * 0.5, py + cs * 0.5, cs * 0.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(230, 240, 255, ${pulse * 0.6})`;
    ctx.beginPath();
    const drift = Math.sin(this.time * 1.3 + variation * 6) * cs * 0.1;
    ctx.arc(px + cs * 0.4 + drift, py + cs * 0.4, cs * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawIce(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cs: number,
    variation: number
  ): void {
    // Light blue ice
    ctx.fillStyle = `rgb(${170 + Math.floor(variation * 20)},${220 + Math.floor(variation * 15)},${240 + Math.floor(variation * 15)})`;
    ctx.fillRect(px, py, cs, cs);

    // Sparkle star
    if (variation > 0.5) {
      const sparkle = 0.5 + 0.5 * Math.sin(this.time * 4 + variation * 20);
      ctx.fillStyle = `rgba(255, 255, 255, ${sparkle * 0.7})`;
      const sx = px + cs * (0.3 + variation * 0.4);
      const sy = py + cs * (0.3 + ((variation * 7) % 1) * 0.4);
      // 4-point star
      ctx.beginPath();
      const starSize = cs * 0.15;
      ctx.moveTo(sx, sy - starSize);
      ctx.lineTo(sx + starSize * 0.3, sy);
      ctx.lineTo(sx, sy + starSize);
      ctx.lineTo(sx - starSize * 0.3, sy);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx - starSize, sy);
      ctx.lineTo(sx, sy + starSize * 0.3);
      ctx.lineTo(sx + starSize, sy);
      ctx.lineTo(sx, sy - starSize * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawGrass(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cs: number,
    variation: number
  ): void {
    // Green base
    const g = 100 + Math.floor(variation * 60);
    ctx.fillStyle = `rgb(30,${g},20)`;
    ctx.fillRect(px, py, cs, cs);

    // Flower dot (on some cells)
    if (variation > 0.8) {
      const colors = ['#ff6b6b', '#ffd93d', '#ff85a2', '#fff'];
      const colorIdx = Math.floor(variation * 4) % colors.length;
      ctx.fillStyle = colors[colorIdx];
      ctx.beginPath();
      ctx.arc(px + cs * 0.5, py + cs * 0.35, cs * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawAsh(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cs: number,
    variation: number
  ): void {
    // Gray ash particles
    const shade = 90 + Math.floor(variation * 40);
    ctx.fillStyle = `rgb(${shade},${shade - 5},${shade - 10})`;
    ctx.beginPath();
    ctx.arc(px + cs * 0.5, py + cs * 0.5, cs * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCursor(gridX: number, gridY: number, brushSize: number): void {
    const ctx = this.ctx;
    const cs = this.cellSize;

    const canvasX = (gridX + 0.5) * cs;
    const canvasY = (gridY + 0.5) * cs;
    const radius = (brushSize + 0.5) * cs;

    // Thick cartoon-style cursor
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Black outline for contrast
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTooltip(gridX: number, gridY: number, text: string): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const padding = 10;
    const fontSize = 13;
    const tailHeight = 8;

    ctx.font = `bold ${fontSize}px 'Comic Sans MS', cursive, sans-serif`;
    ctx.textBaseline = 'top';

    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Position: speech bubble above cursor
    let bubbleX = gridX * cs - textWidth / 2;
    let bubbleY = gridY * cs - textHeight - padding * 2 - tailHeight - 10;

    // Keep in bounds
    if (bubbleX < 5) bubbleX = 5;
    if (bubbleX + textWidth + padding * 2 > CANVAS_SIZE - 5) {
      bubbleX = CANVAS_SIZE - textWidth - padding * 2 - 5;
    }
    if (bubbleY < 5) bubbleY = gridY * cs + cs + 5;

    const bubbleW = textWidth + padding * 2;
    const bubbleH = textHeight + padding * 2;

    // Speech bubble background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8);
    ctx.fill();
    ctx.stroke();

    // Tail
    const tailX = bubbleX + bubbleW / 2;
    const tailY = bubbleY + bubbleH;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(tailX - 5, tailY);
    ctx.lineTo(tailX, tailY + tailHeight);
    ctx.lineTo(tailX + 5, tailY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#333';
    ctx.fillText(text, bubbleX + padding, bubbleY + padding);
  }

  drawVelocityOverlay(
    _grid: Grid,
    _scale?: number,
    _spacing?: number,
    _minMagnitude?: number
  ): void {
    // Velocity overlay not implemented for cartoon renderer
  }

  clear(): void {
    this.ctx.fillStyle = '#0a0a2e';
    this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }
}
