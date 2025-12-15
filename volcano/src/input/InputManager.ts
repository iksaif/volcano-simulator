// Input manager for handling mouse and touch events

import { Grid } from '../core/Grid';
import { LavaInjector } from './LavaInjector';
import { MaterialBrush } from './MaterialBrush';

export class InputManager {
  private canvas: HTMLCanvasElement;
  private grid: Grid;
  public lavaInjector: LavaInjector;
  public materialBrush: MaterialBrush;
  private isMouseDown = false;
  private mouseGridX: number | null = null;
  private mouseGridY: number | null = null;

  constructor(canvas: HTMLCanvasElement, grid: Grid) {
    this.canvas = canvas;
    this.grid = grid;
    this.lavaInjector = new LavaInjector();
    this.materialBrush = new MaterialBrush();

    this.setupEventListeners();
  }

  /**
   * Setup mouse and touch event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', (e) => {
      this.handleMouseUp();
      this.mouseGridX = null;
      this.mouseGridY = null;
    });

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  /**
   * Convert mouse/touch coordinates to grid coordinates
   */
  private getGridCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.grid.width / rect.width;
    const scaleY = this.grid.height / rect.height;

    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top) * scaleY);

    return { x, y };
  }

  /**
   * Handle mouse down
   */
  private handleMouseDown(e: MouseEvent): void {
    this.isMouseDown = true;
    const { x, y } = this.getGridCoords(e.clientX, e.clientY);

    // Check if clicking in bottom area for lava injection
    if (y > this.grid.height - 10) {
      this.lavaInjector.activate(x);
    } else {
      // Paint with brush
      this.materialBrush.paint(this.grid, x, y);
    }
  }

  /**
   * Handle mouse move
   */
  private handleMouseMove(e: MouseEvent): void {
    const { x, y } = this.getGridCoords(e.clientX, e.clientY);

    // Always track mouse position for cursor display
    this.mouseGridX = x;
    this.mouseGridY = y;

    // Only paint when mouse is down
    if (!this.isMouseDown) return;

    // Only paint with brush (not in injection area)
    if (y <= this.grid.height - 10) {
      this.materialBrush.paint(this.grid, x, y);
    }
  }

  /**
   * Handle mouse up
   */
  private handleMouseUp(): void {
    this.isMouseDown = false;
    // Clear all injection points when mouse is released
    this.lavaInjector.clear();
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.isMouseDown = true;
      const { x, y } = this.getGridCoords(touch.clientX, touch.clientY);

      if (y > this.grid.height - 10) {
        this.lavaInjector.activate(x);
      } else {
        this.materialBrush.paint(this.grid, x, y);
      }
    }
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0 && this.isMouseDown) {
      const touch = e.touches[0];
      const { x, y } = this.getGridCoords(touch.clientX, touch.clientY);

      if (y <= this.grid.height - 10) {
        this.materialBrush.paint(this.grid, x, y);
      }
    }
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(): void {
    this.isMouseDown = false;
    // Clear all injection points when touch is released
    this.lavaInjector.clear();
  }

  /**
   * Update (called each frame)
   */
  update(grid: Grid): void {
    this.lavaInjector.update(grid);
  }

  /**
   * Get current mouse position in grid coordinates
   */
  getMousePosition(): { x: number; y: number } | null {
    if (this.mouseGridX !== null && this.mouseGridY !== null) {
      return { x: this.mouseGridX, y: this.mouseGridY };
    }
    return null;
  }
}
