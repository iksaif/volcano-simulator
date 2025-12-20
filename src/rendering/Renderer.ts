// Renderer using direct pixel manipulation with Uint32Array

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { Config } from '../app/Config';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private pixelBuffer: Uint32Array; // Direct pixel access (ABGR format on little-endian)
  private gridWidth: number;
  private gridHeight: number;
  private scale: number;

  constructor(canvas: HTMLCanvasElement, width: number, height: number, scale: number = 1) {
    this.canvas = canvas;
    this.gridWidth = width;
    this.gridHeight = height;
    this.scale = scale;

    // Canvas dimensions are scaled up from grid dimensions
    this.canvas.width = width * scale;
    this.canvas.height = height * scale;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;

    // Create ImageData for scaled canvas
    this.imageData = this.ctx.createImageData(width * scale, height * scale);
    this.pixelBuffer = new Uint32Array(this.imageData.data.buffer);
  }

  /**
   * Render the grid to canvas using a color mapping function
   */
  render(grid: Grid, getColor: (cell: import('../core/Cell').Cell) => number): void {
    const canvasWidth = this.canvas.width;

    // Render each grid cell as scale×scale pixels
    for (let gy = 0; gy < this.gridHeight; gy++) {
      for (let gx = 0; gx < this.gridWidth; gx++) {
        const cell = grid.get(gx, gy);
        const color = getColor(cell);

        // Fill scale×scale pixel block for this grid cell
        const startX = gx * this.scale;
        const startY = gy * this.scale;

        for (let py = 0; py < this.scale; py++) {
          for (let px = 0; px < this.scale; px++) {
            const pixelIndex = (startY + py) * canvasWidth + (startX + px);
            this.pixelBuffer[pixelIndex] = color;
          }
        }
      }
    }

    // Single putImageData call per frame for best performance
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Draw brush cursor overlay at given grid coordinates
   */
  drawCursor(gridX: number, gridY: number, brushSize: number): void {
    // Convert grid coordinates to canvas coordinates
    const canvasX = (gridX + 0.5) * this.scale;
    const canvasY = (gridY + 0.5) * this.scale;
    const scaledRadius = (brushSize + 0.5) * this.scale;

    // Draw a circle outline to show brush area
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = Math.max(1, this.scale / 4);
    this.ctx.beginPath();
    this.ctx.arc(
      canvasX,
      canvasY,
      scaledRadius,
      0,
      Math.PI * 2
    );
    this.ctx.stroke();

    // Draw inner dot to show exact center
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, this.scale / 2, 0, Math.PI * 2);
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

    // Convert grid coordinates to canvas coordinates
    const canvasX = gridX * this.scale;
    const canvasY = gridY * this.scale;

    // Position tooltip offset from cursor (avoid covering it)
    let tooltipX = canvasX + 10;
    let tooltipY = canvasY - 25;

    // Keep tooltip within canvas bounds
    if (tooltipX + textWidth + padding * 2 > this.canvas.width) {
      tooltipX = canvasX - textWidth - padding * 2 - 10;
    }
    if (tooltipY < 0) {
      tooltipY = canvasY + 10;
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
   * Draw velocity vectors as arrows overlay
   * @param grid - The simulation grid
   * @param scale - Scale factor for arrow length (default: 0.1)
   * @param spacing - Draw arrows every N cells (default: 4)
   * @param minMagnitude - Minimum velocity magnitude to draw (default: 1)
   */
  /**
   * Calculate how "active" a cell is based on divergence from equilibrium conditions.
   * Returns a weight from 0 (passive/equilibrium) to 1 (highly active).
   *
   * "Active" cells are driving forces (hot air rising, cold water sinking),
   * while "passive" cells are just reacting (room temperature air being displaced).
   */
  private calculateActivityWeight(cell: Cell): number {
    if (Cell.isEmpty(cell)) return 0;

    // Temperature divergence from room temperature (primary indicator of activity)
    const temperature = Cell.getTemperature(cell);
    const tempDelta = Math.abs(temperature - Config.ROOM_TEMPERATURE);

    // Normalize: 20°C divergence = significant activity (more sensitive)
    const tempWeight = Math.min(tempDelta / 20, 1);

    // Velocity magnitude can also indicate activity
    const vx = Cell.getVelocityX(cell);
    const vy = Cell.getVelocityY(cell);
    const speed = Math.sqrt(vx * vx + vy * vy);
    const velocityWeight = Math.min(speed / 1.5, 1);

    // Combine: temperature and velocity balanced (50/50), plus baseline
    // This makes more cells visible while still emphasizing active ones
    const combinedWeight = tempWeight * 0.5 + velocityWeight * 0.5;

    // Add a baseline weight to ensure some visibility even for near-equilibrium cells
    return Math.max(combinedWeight, 0.3);
  }

  drawVelocityOverlay(
    grid: Grid,
    velocityScale: number = 0.1,
    spacing: number = 4,
    minMagnitude: number = 1
  ): void {
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; // Black arrows
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.lineWidth = Math.max(1, this.scale / 4);

    let totalArrows = 0;
    let arrowsDrawn = 0;
    let maxMagnitude = 0;

    // Draw arrows at regular intervals (spacing grid)
    for (let gridY = 0; gridY < grid.height; gridY += spacing) {
      for (let gridX = 0; gridX < grid.width; gridX += spacing) {
        totalArrows++;

        // Calculate weighted average velocity within this spacing region
        let weightedVx = 0;
        let weightedVy = 0;
        let totalWeight = 0;

        // Iterate over all cells in the spacing region
        for (let dy = 0; dy < spacing && gridY + dy < grid.height; dy++) {
          for (let dx = 0; dx < spacing && gridX + dx < grid.width; dx++) {
            const x = gridX + dx;
            const y = gridY + dy;
            const cell = grid.get(x, y);

            // Skip empty cells
            if (Cell.isEmpty(cell)) continue;

            // Calculate activity weight for this cell
            const weight = this.calculateActivityWeight(cell);
            if (weight === 0) continue;

            // Accumulate weighted velocity
            const vx = Cell.getVelocityX(cell);
            const vy = Cell.getVelocityY(cell);
            weightedVx += vx * weight;
            weightedVy += vy * weight;
            totalWeight += weight;
          }
        }

        // Skip if no active cells in this region
        if (totalWeight === 0) continue;

        // Calculate average velocity (weighted by activity)
        const avgVx = weightedVx / totalWeight;
        const avgVy = weightedVy / totalWeight;

        // Calculate velocity magnitude
        const magnitude = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
        if (magnitude > maxMagnitude) maxMagnitude = magnitude;

        // Skip if velocity is too small
        if (magnitude < minMagnitude) continue;

        arrowsDrawn++;

        // Arrow start position (center of spacing region) in canvas coordinates
        const startX = (gridX + spacing / 2) * this.scale;
        const startY = (gridY + spacing / 2) * this.scale;

        // Calculate desired arrow length (scaled by velocity)
        const desiredLength = magnitude * velocityScale * this.scale;

        // Clamp arrow length to spacing to avoid overlaps
        const maxArrowLength = spacing * this.scale * 0.8; // 80% of spacing for some margin
        const actualLength = Math.min(desiredLength, maxArrowLength);

        // Calculate direction and apply clamped length
        const dirX = avgVx / magnitude;
        const dirY = avgVy / magnitude;
        const endX = startX + dirX * actualLength;
        const endY = startY + dirY * actualLength;

        // Draw arrow line
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        // Draw arrowhead
        const arrowLength = 0.5 * this.scale;
        const arrowAngle = Math.PI / 5; // 36 degrees (wider angle)

        // Calculate arrow direction
        const angle = Math.atan2(avgVy, avgVx);

        // Draw two lines for arrowhead
        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(
          endX - arrowLength * Math.cos(angle - arrowAngle),
          endY - arrowLength * Math.sin(angle - arrowAngle)
        );
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(
          endX - arrowLength * Math.cos(angle + arrowAngle),
          endY - arrowLength * Math.sin(angle + arrowAngle)
        );
        this.ctx.stroke();
      }
    }

    // Debug output (only log once per second to avoid spam)
    if (!this.lastVelocityLog || Date.now() - this.lastVelocityLog > 1000) {
      console.log(`Velocity stats: ${arrowsDrawn}/${totalArrows} arrows drawn, max magnitude: ${maxMagnitude.toFixed(2)}`);
      this.lastVelocityLog = Date.now();
    }
  }

  private lastVelocityLog: number = 0;

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
