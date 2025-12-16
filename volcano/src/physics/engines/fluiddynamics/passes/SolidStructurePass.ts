// Solid structure pass - identifies and anchors solid clusters

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import { MaterialState } from '../../../../core/Types';

export class SolidStructurePass {
  static execute(grid: Grid): void {
    // Reset all cluster IDs and anchored flags
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (!Cell.isEmpty(cell)) {
          grid.set(x, y, Cell.setClusterId(Cell.setAnchored(cell, false), -1));
        }
      }
    }

    let nextClusterId = 0;
    const visited = new Set<string>();

    // Flood-fill to identify clusters
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;

        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const material = MaterialRegistry.get(Cell.getMaterialId(cell));
        if (material.state !== MaterialState.Solid || material.granular) continue;
        if (!material.cohesion || material.cohesion < 0.1) continue;

        // Start a new cluster
        const cluster = this.floodFill(grid, x, y, visited);
        const isAnchored = this.isClusterAnchored(cluster, grid);

        // Assign cluster ID and anchored status
        for (const pos of cluster) {
          const [cx, cy] = pos.split(',').map(Number);
          let c = grid.get(cx, cy);
          c = Cell.setClusterId(c, nextClusterId);
          c = Cell.setAnchored(c, isAnchored);
          grid.set(cx, cy, c);
        }

        nextClusterId++;
      }
    }
  }

  private static floodFill(grid: Grid, startX: number, startY: number, visited: Set<string>): Set<string> {
    const cluster = new Set<string>();
    const queue: [number, number][] = [[startX, startY]];

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key) || cluster.has(key)) continue;
      if (!grid.inBounds(x, y)) continue;

      const cell = grid.get(x, y);
      if (Cell.isEmpty(cell)) continue;

      const material = MaterialRegistry.get(Cell.getMaterialId(cell));
      if (material.state !== MaterialState.Solid || material.granular) continue;
      if (!material.cohesion || material.cohesion < 0.1) continue;

      visited.add(key);
      cluster.add(key);

      // Check 8 neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          queue.push([x + dx, y + dy]);
        }
      }
    }

    return cluster;
  }

  private static isClusterAnchored(cluster: Set<string>, grid: Grid): boolean {
    for (const pos of cluster) {
      const [x, y] = pos.split(',').map(Number);
      // Anchored if touching bottom or sides of world
      if (y >= grid.height - 1 || x === 0 || x >= grid.width - 1) {
        return true;
      }
    }
    return false;
  }
}
