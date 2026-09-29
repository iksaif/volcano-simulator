// Input manager for handling mouse and touch events

import { Grid } from '../core/Grid';
import { LavaInjector } from './LavaInjector';
import { MaterialBrush } from './MaterialBrush';
import { MaterialType } from '../core/Types';

export class InputManager {
  private canvas: HTMLCanvasElement;
  private grid: Grid;
  public lavaInjector: LavaInjector;
  public materialBrush: MaterialBrush;
  private isMouseDown = false;
  private isErasing = false;
  private mouseGridX: number | null = null;
  private mouseGridY: number | null = null;

  // Handlers are bound once so the same references can be removed on canvas switch
  private readonly onMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
  private readonly onMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
  private readonly onMouseUp = () => this.handleMouseUp();
  private readonly onMouseLeave = () => {
    this.handleMouseUp();
    this.mouseGridX = null;
    this.mouseGridY = null;
  };
  private readonly onContextMenu = (e: MouseEvent) => e.preventDefault();
  private readonly onWheel = (e: WheelEvent) => this.handleWheel(e);
  private readonly onTouchStart = (e: TouchEvent) => this.handleTouchStart(e);
  private readonly onTouchMove = (e: TouchEvent) => this.handleTouchMove(e);
  private readonly onTouchEnd = () => this.handleTouchEnd();

  /** Called when the scroll wheel changes the brush size, so the UI can sync */
  public onBrushSizeChange: ((size: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, grid: Grid) {
    this.canvas = canvas;
    this.grid = grid;
    this.lavaInjector = new LavaInjector();
    this.lavaInjector.setGrid(grid); // Initialize shaft position
    this.materialBrush = new MaterialBrush();

    this.setupEventListeners();
  }

  /**
   * Switch to a different canvas (for renderer switching)
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    // Remove event listeners from old canvas
    this.removeEventListeners();

    // Update canvas reference
    this.canvas = canvas;

    // Add event listeners to new canvas
    this.setupEventListeners();
  }

  /**
   * Remove event listeners from canvas
   */
  private removeEventListeners(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
  }

  /**
   * Setup mouse and touch event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    // Touch events
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
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
    this.isErasing = e.button === 2; // Right button erases
    const { x, y } = this.getGridCoords(e.clientX, e.clientY);

    this.paintAt(x, y);
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

    this.paintAt(x, y);
  }

  /**
   * Handle mouse up
   */
  private handleMouseUp(): void {
    this.isMouseDown = false;
    this.isErasing = false;
  }

  /**
   * Paint with the selected material, or with air when erasing
   */
  private paintAt(x: number, y: number): void {
    if (this.isErasing) {
      this.materialBrush.paint(this.grid, x, y, MaterialType.Air);
    } else {
      this.materialBrush.paint(this.grid, x, y);
    }
  }

  /**
   * Handle scroll wheel: adjust brush size
   */
  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const step = e.deltaY < 0 ? 1 : -1;
    this.materialBrush.setBrushSize(this.materialBrush.getBrushSize() + step);
    this.onBrushSizeChange?.(this.materialBrush.getBrushSize());
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

      this.materialBrush.paint(this.grid, x, y);
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

      this.materialBrush.paint(this.grid, x, y);
    }
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(): void {
    this.isMouseDown = false;
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
