// Physics Engine Debugger - helps visualize and debug physics engine behavior

import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { MaterialRegistry } from '../materials/MaterialRegistry';

export interface PhysicsStats {
  frame: number;
  timestamp: number;

  // Velocity stats
  avgVelocityMagnitude: number;
  maxVelocityMagnitude: number;
  cellsMoving: number;

  // Material counts
  materialCounts: Map<number, number>;

  // Structural stats (for fluid dynamics)
  clustersCount: number;
  anchoredCells: number;
  fracturedCells: number; // integrity < 0.5

  // Thermal stats
  avgTemperature: number;
  maxTemperature: number;
  minTemperature: number;

  // Pressure stats
  avgPressure: number;
  maxPressure: number;
}

export class PhysicsDebugger {
  private static enabled: boolean = false;
  private static statsHistory: PhysicsStats[] = [];
  private static maxHistorySize: number = 100;
  private static frameCount: number = 0;
  private static debugPanel: HTMLDivElement | null = null;

  static enable(): void {
    this.enabled = true;
    this.createDebugPanel();
    console.log('🔍 Physics Debugger enabled');
  }

  static disable(): void {
    this.enabled = false;
    if (this.debugPanel) {
      this.debugPanel.style.display = 'none';
    }
    console.log('🔍 Physics Debugger disabled');
  }

  static toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Analyze grid and collect statistics
   */
  static analyzeGrid(grid: Grid): PhysicsStats {
    const stats: PhysicsStats = {
      frame: this.frameCount++,
      timestamp: performance.now(),
      avgVelocityMagnitude: 0,
      maxVelocityMagnitude: 0,
      cellsMoving: 0,
      materialCounts: new Map(),
      clustersCount: 0,
      anchoredCells: 0,
      fracturedCells: 0,
      avgTemperature: 0,
      maxTemperature: -Infinity,
      minTemperature: Infinity,
      avgPressure: 0,
      maxPressure: 0,
    };

    let totalVelocity = 0;
    let totalTemp = 0;
    let totalPressure = 0;
    let cellCount = 0;
    const clusterIds = new Set<number>();

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        cellCount++;
        const materialId = Cell.getMaterialId(cell);

        // Material counts
        stats.materialCounts.set(materialId, (stats.materialCounts.get(materialId) || 0) + 1);

        // Velocity stats
        const vx = Cell.getVelocityX(cell);
        const vy = Cell.getVelocityY(cell);
        const velMag = Math.sqrt(vx * vx + vy * vy);
        totalVelocity += velMag;
        stats.maxVelocityMagnitude = Math.max(stats.maxVelocityMagnitude, velMag);
        if (velMag > 0.01) stats.cellsMoving++;

        // Structural stats
        const clusterId = Cell.getClusterId(cell);
        if (clusterId >= 0) clusterIds.add(clusterId);
        if (Cell.isAnchored(cell)) stats.anchoredCells++;
        if (Cell.getIntegrity(cell) < 0.5) stats.fracturedCells++;

        // Thermal stats
        const temp = Cell.getTemperature(cell);
        totalTemp += temp;
        stats.maxTemperature = Math.max(stats.maxTemperature, temp);
        stats.minTemperature = Math.min(stats.minTemperature, temp);

        // Pressure stats
        const pressure = Cell.getPressure(cell);
        totalPressure += pressure;
        stats.maxPressure = Math.max(stats.maxPressure, pressure);
      }
    }

    if (cellCount > 0) {
      stats.avgVelocityMagnitude = totalVelocity / cellCount;
      stats.avgTemperature = totalTemp / cellCount;
      stats.avgPressure = totalPressure / cellCount;
    }

    stats.clustersCount = clusterIds.size;

    // Store in history
    this.statsHistory.push(stats);
    if (this.statsHistory.length > this.maxHistorySize) {
      this.statsHistory.shift();
    }

    return stats;
  }

  /**
   * Update the debug panel with current stats
   */
  static update(grid: Grid, engineName: string): void {
    if (!this.enabled) return;

    const stats = this.analyzeGrid(grid);
    this.updateDebugPanel(stats, engineName);
  }

  /**
   * Create debug panel UI
   */
  private static createDebugPanel(): void {
    if (this.debugPanel) {
      this.debugPanel.style.display = 'block';
      return;
    }

    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'physics-debug-panel';
    this.debugPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 15px;
      border: 2px solid #0f0;
      border-radius: 4px;
      max-width: 300px;
      z-index: 10000;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    `;

    document.body.appendChild(this.debugPanel);
  }

  /**
   * Update debug panel content
   */
  private static updateDebugPanel(stats: PhysicsStats, engineName: string): void {
    if (!this.debugPanel) return;

    const materialNames: string[] = [];
    for (const [matId, count] of stats.materialCounts) {
      const material = MaterialRegistry.get(matId);
      materialNames.push(`${material.name}: ${count}`);
    }

    this.debugPanel.innerHTML = `
      <div style="color: #ff0; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #0f0; padding-bottom: 5px;">
        ⚙️ PHYSICS DEBUG - ${engineName}
      </div>

      <div style="margin-bottom: 8px;">
        <div style="color: #0ff; font-weight: bold;">Frame: ${stats.frame}</div>
      </div>

      <div style="margin-bottom: 8px;">
        <div style="color: #0ff; font-weight: bold;">MOTION:</div>
        <div>Avg Velocity: ${stats.avgVelocityMagnitude.toFixed(4)} cells/s</div>
        <div>Max Velocity: ${stats.maxVelocityMagnitude.toFixed(4)} cells/s</div>
        <div>Cells Moving: ${stats.cellsMoving}</div>
      </div>

      <div style="margin-bottom: 8px;">
        <div style="color: #0ff; font-weight: bold;">STRUCTURE:</div>
        <div>Clusters: ${stats.clustersCount}</div>
        <div>Anchored Cells: ${stats.anchoredCells}</div>
        <div>Fractured Cells: ${stats.fracturedCells}</div>
      </div>

      <div style="margin-bottom: 8px;">
        <div style="color: #0ff; font-weight: bold;">THERMAL:</div>
        <div>Avg Temp: ${stats.avgTemperature.toFixed(1)}°C</div>
        <div>Range: ${stats.minTemperature.toFixed(1)}°C - ${stats.maxTemperature.toFixed(1)}°C</div>
      </div>

      <div style="margin-bottom: 8px;">
        <div style="color: #0ff; font-weight: bold;">PRESSURE:</div>
        <div>Avg: ${stats.avgPressure.toFixed(1)}</div>
        <div>Max: ${stats.maxPressure.toFixed(1)}</div>
      </div>

      <div>
        <div style="color: #0ff; font-weight: bold;">MATERIALS:</div>
        ${materialNames.map(name => `<div style="font-size: 10px;">• ${name}</div>`).join('')}
      </div>
    `;
  }

  /**
   * Log detailed cell information at a specific position
   */
  static inspectCell(grid: Grid, x: number, y: number): void {
    if (!grid.inBounds(x, y)) {
      console.log(`❌ Position (${x}, ${y}) is out of bounds`);
      return;
    }

    const cell = grid.get(x, y);
    if (Cell.isEmpty(cell)) {
      console.log(`📍 Cell at (${x}, ${y}) is EMPTY`);
      return;
    }

    const material = MaterialRegistry.get(Cell.getMaterialId(cell));
    const vx = Cell.getVelocityX(cell);
    const vy = Cell.getVelocityY(cell);
    const velMag = Math.sqrt(vx * vx + vy * vy);

    console.log(`🔬 CELL INSPECTION (${x}, ${y})`);
    console.log(`├─ Material: ${material.name} (ID: ${Cell.getMaterialId(cell)})`);
    console.log(`├─ State: ${material.state}`);
    console.log(`├─ Temperature: ${Cell.getTemperature(cell).toFixed(2)}°C`);
    console.log(`├─ Pressure: ${Cell.getPressure(cell).toFixed(2)}`);
    console.log(`├─ Velocity: (${vx.toFixed(4)}, ${vy.toFixed(4)}) | Magnitude: ${velMag.toFixed(4)}`);
    console.log(`├─ Integrity: ${Cell.getIntegrity(cell).toFixed(3)}`);
    console.log(`├─ Cluster ID: ${Cell.getClusterId(cell)}`);
    console.log(`├─ Anchored: ${Cell.isAnchored(cell)}`);
    console.log(`├─ Flags: 0x${Cell.getFlags(cell).toString(16)}`);
    console.log(`└─ Density: ${Cell.getDensity(cell).toFixed(2)} kg/m³`);
  }

  /**
   * Export stats history as JSON
   */
  static exportStats(): void {
    const data = JSON.stringify(this.statsHistory, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `physics-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('📊 Exported stats history');
  }

  /**
   * Clear stats history
   */
  static clearHistory(): void {
    this.statsHistory = [];
    this.frameCount = 0;
    console.log('🗑️  Cleared stats history');
  }

  /**
   * Get stats history
   */
  static getHistory(): PhysicsStats[] {
    return [...this.statsHistory];
  }
}

// Expose to window for console access
(window as any).PhysicsDebugger = PhysicsDebugger;
