// Renderer using direct pixel manipulation with Uint32Array

import { Grid } from '../core/Grid';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private pixelBuffer: Uint32Array; // Direct pixel access (ABGR format on little-endian)

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;

    // Create ImageData and get direct access to pixel buffer
    this.imageData = this.ctx.createImageData(width, height);
    this.pixelBuffer = new Uint32Array(this.imageData.data.buffer);
  }

  /**
   * Render the grid to canvas using a color mapping function
   */
  render(grid: Grid, getColor: (cell: import('../core/Cell').Cell) => number): void {
    const size = grid.size;

    // Direct pixel write loop
    for (let i = 0; i < size; i++) {
      const cell = grid.getUnsafe(i);
      const color = getColor(cell);

      // Write color in ABGR format (little-endian: 0xAABBGGRR)
      this.pixelBuffer[i] = color;
    }

    // Single putImageData call per frame for best performance
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Draw brush cursor overlay at given grid coordinates
   */
  drawCursor(gridX: number, gridY: number, brushSize: number): void {
    // Draw a circle outline to show brush area
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(
      gridX + 0.5, // Center of grid cell
      gridY + 0.5,
      brushSize + 0.5, // Brush radius
      0,
      Math.PI * 2
    );
    this.ctx.stroke();

    // Draw inner dot to show exact center
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(gridX + 0.5, gridY + 0.5, 0.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw tooltip showing cell information at cursor position
   */
  drawTooltip(gridX: number, gridY: number, text: string): void {
    const padding = 8;
    const fontSize = 12;

    this.ctx.font = `${fontSize}px monospace`;
    this.ctx.textBaseline = 'top';

    // Measure text to size the background
    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Position tooltip offset from cursor (avoid covering it)
    let tooltipX = gridX + 10;
    let tooltipY = gridY - 25;

    // Keep tooltip within canvas bounds
    if (tooltipX + textWidth + padding * 2 > this.canvas.width) {
      tooltipX = gridX - textWidth - padding * 2 - 10;
    }
    if (tooltipY < 0) {
      tooltipY = gridY + 10;
    }

    // Draw background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(
      tooltipX,
      tooltipY,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    // Draw border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      tooltipX,
      tooltipY,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    // Draw text
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(text, tooltipX + padding, tooltipY + padding);
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
