// Motion pass - moves cells based on velocity
// Uses priority queue for O(n log n) performance instead of iterative cascade

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import type { IPhysicsEnginePass } from "../../../IPhysicsEngine";

interface MoveRequest {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  priority: number;
  cell: Cell;
}

export class MotionPass implements IPhysicsEnginePass {
  execute(grid: Grid, dt: number): void {
    const debug = (globalThis as any).MOTION_PASS_DEBUG || false;
    const nextGrid = new Grid(grid.width, grid.height);
    const moveRequests: MoveRequest[] = [];

    // Phase 1: Generate move requests with priority
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        // Anchored solids stay in place (highest priority)
        if (Cell.isAnchored(cell)) {
          nextGrid.set(x, y, cell);
          continue;
        }

        const vx = Cell.getVelocityX(cell);
        const vy = Cell.getVelocityY(cell);

        // Calculate target position with directional rounding
        const dx = vx * dt;
        const dy = vy * dt;
        // TODO: Target should always be a neightbor of the current cell and
        // we should simulate speed with either accumulation or randomness.
        let targetX = dx > 0 ? Math.ceil(x + dx) : dx < 0 ? Math.floor(x + dx) : x;
        let targetY = dy > 0 ? Math.ceil(y + dy) : dy < 0 ? Math.floor(y + dy) : y;

        // Detect border collisions (before clamping)
        const hitBorder = targetX < 0 || targetX >= grid.width || targetY < 0 || targetY >= grid.height;

        // Clamp to grid bounds
        targetX = Math.max(0, Math.min(grid.width - 1, targetX));
        targetY = Math.max(0, Math.min(grid.height - 1, targetY));

        // Calculate priority:
        // 1. Border collisions (can't move): priority 100000
        // 2. Kinetic energy (density * speed): priority 0-1000
        const density = Cell.getDensity(cell);
        const speed = Math.sqrt(vx * vx + vy * vy);
        let priority = density * speed;

        if (hitBorder) {
          // Hit border - very high priority (will stay in place)
          priority = 100000 + priority;
        }

        const request: MoveRequest = { fromX: x, fromY: y, toX: targetX, toY: targetY, priority, cell };
        moveRequests.push(request);
      }
    }

    // Phase 2: Sort by priority (descending - highest priority first)
    // Then by Y position (bottom to top) to process lower cells first
    moveRequests.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (Math.abs(priorityDiff) > 0.01) return priorityDiff;
      // Same priority: process from bottom to top
      return b.fromY - a.fromY;
    });

    if (debug) {
      const border = moveRequests.filter(r => r.priority >= 100000 && r.priority < 1000000).length;
      const moving = moveRequests.length - border;
      console.log(`  Sorted ${moveRequests.length} requests: ${border} border, ${moving} moving`);

      // Show first few move requests
      if (moveRequests.length <= 5) {
        for (const req of moveRequests) {
          console.log(`    (${req.fromX},${req.fromY}) -> (${req.toX},${req.toY}), priority: ${req.priority.toFixed(2)}`);
        }
      }
    }

    // Phase 3: Single-pass greedy with deferred source reservation
    const occupied = new Set<string>();
    const reservedSources = new Set<string>();
    const winners: MoveRequest[] = [];
    const losers: MoveRequest[] = [];

    // TODO: check what determines if we can move or not to another cell.
    //  but I suspect it involves density and viscosity.

    // TODO: For liquid/gas/granular solid we can swap sides (based on viscosity for spped),
    //  but for solid we *move* them, and if a solid moves it need to move other solids
    //  in the same direction. We can allow the move based on kinetic energy (dv*density)
    //  compared to sum of density of the cells in the way. if there is a line
    //  we can also make them move to the side when there is space (randmly, with more probability
    //  when the line is blocked by a border)
    //  Actually when we don't have enough energy to move the entire line we can still
    //  make solids move to the side if there is (ok to replace air first and compress a gas later)


    // Pass 3a: Determine winners and losers (greedy, priority order)
    for (const request of moveRequests) {
      const sourceKey = `${request.fromX},${request.fromY}`;
      const targetKey = `${request.toX},${request.toY}`;

      // Stationary cells stay in place
      if (targetKey === sourceKey) {
        winners.push(request);
        occupied.add(sourceKey);
        continue;
      }

      // Check if target is available (not occupied and not reserved as a source)
      const targetBlocked = occupied.has(targetKey) || reservedSources.has(targetKey);

      if (!targetBlocked) {
        // Winner - can move to target
        winners.push(request);
        occupied.add(targetKey);
      } else {
        // Loser - must stay at source
        losers.push(request);
        // Reserve source to prevent others from taking it
        reservedSources.add(sourceKey);
        occupied.add(sourceKey);
      }
    }

    // Pass 3b: Place all cells
    let placed = 0;
    let stayed = 0;

    for (const winner of winners) {
      nextGrid.set(winner.toX, winner.toY, winner.cell);
      if (winner.toX !== winner.fromX || winner.toY !== winner.fromY) {
        placed++;
      } else {
        stayed++;
      }
    }

    for (const loser of losers) {
      nextGrid.set(loser.fromX, loser.fromY, loser.cell);
      stayed++;
    }

    if (debug) {
      console.log(`  Winners: ${winners.length}, Losers: ${losers.length}`);
      console.log(`  Placed: ${placed}, Stayed: ${stayed}, Total: ${placed + stayed}`);
    }

    // Copy nextGrid back to grid
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        grid.set(x, y, nextGrid.get(x, y));
      }
    }
  }
}
