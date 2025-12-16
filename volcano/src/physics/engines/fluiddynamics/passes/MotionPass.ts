// Motion pass - moves cells based on velocity

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';

interface MoveRequest {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  priority: number;
  cell: Cell;
}

export class MotionPass {
  static execute(grid: Grid, dt: number): void {
    const debug = (globalThis as any).MOTION_PASS_DEBUG || false;
    const nextGrid = new Grid(grid.width, grid.height);
    const moveRequests: MoveRequest[] = [];
    const targetMap = new Map<string, MoveRequest[]>();

    // Phase 1: Generate move requests (don't place anything in nextGrid yet!)
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        // Anchored solids (connected to ground) stay in place
        if (Cell.isAnchored(cell)) {
          nextGrid.set(x, y, cell);
          continue;
        }

        const vx = Cell.getVelocityX(cell);
        const vy = Cell.getVelocityY(cell);

        // Calculate target position with directional rounding
        // Favor movement in the direction of velocity to prevent sub-pixel stalling
        const dx = vx * dt;
        const dy = vy * dt;
        let targetX = dx > 0 ? Math.ceil(x + dx) : dx < 0 ? Math.floor(x + dx) : x;
        let targetY = dy > 0 ? Math.ceil(y + dy) : dy < 0 ? Math.floor(y + dy) : y;
        targetX = Math.max(0, Math.min(grid.width - 1, targetX));
        targetY = Math.max(0, Math.min(grid.height - 1, targetY));

        // Always create move request (even if not moving) to ensure cell is tracked
        // Stationary cells will be handled in conflict resolution

        // Priority: denser and faster cells win
        const density = Cell.getDensity(cell);
        const speed = Math.sqrt(vx * vx + vy * vy);
        const priority = density * (1 + speed);

        const request: MoveRequest = { fromX: x, fromY: y, toX: targetX, toY: targetY, priority, cell };
        moveRequests.push(request);

        const key = `${targetX},${targetY}`;
        if (!targetMap.has(key)) targetMap.set(key, []);
        targetMap.get(key)!.push(request);
      }
    }

    // Phase 2a: Place all stationary cells first (target==source)
    // These cells don't actually move and should be untouchable
    const processedSources = new Set<string>();
    const losers: MoveRequest[] = [];

    let stationaryCount = 0;
    for (const request of moveRequests) {
      if (request.fromX === request.toX && request.fromY === request.toY) {
        nextGrid.set(request.fromX, request.fromY, request.cell);
        processedSources.add(`${request.fromX},${request.fromY}`);
        stationaryCount++;
      }
    }

    if (debug) {
      console.log(`  Phase 2a: Placed ${stationaryCount} stationary cells`);
    }

    // Phase 2b: Build dependency map - iterate until blocked positions stabilize
    const neededPositions = new Set<string>();
    let changed = true;
    let iterations = 0;
    const maxIterations = grid.height * 2; // Allow full convergence
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const [key, requests] of targetMap) {
        const [tx, ty] = key.split(',').map(Number);
        const targetCell = nextGrid.get(tx, ty);
        const targetOccupied = !Cell.isEmpty(targetCell) || neededPositions.has(key);

        if (targetOccupied) {
          // Target occupied or blocked, requests will be losers needing to return home
          for (const req of requests) {
            if (req.fromX !== req.toX || req.fromY !== req.toY) {
              const sourceKey = `${req.fromX},${req.fromY}`;
              if (!neededPositions.has(sourceKey)) {
                neededPositions.add(sourceKey);
                changed = true;
              }
            }
          }
        }
      }
    }

    if (debug) {
      console.log(`  Phase 2b: Blocking cascade converged in ${iterations} iterations (max: ${maxIterations})`);
      console.log(`           Marked ${neededPositions.size} positions as needed by losers`);
      if (iterations >= maxIterations) {
        console.log(`           ⚠️  Hit iteration limit! May not have fully converged`);
      }
    }

    // Phase 2c: Resolve conflicts for actual moves
    let winnersPlaced = 0;
    for (const [key, requests] of targetMap) {
      const [tx, ty] = key.split(',').map(Number);
      const targetCell = nextGrid.get(tx, ty);

      if (!Cell.isEmpty(targetCell)) {
        // Target occupied by anchored cell, all requests become losers
        losers.push(...requests);
        continue;
      }

      // Filter out stationary requests (already placed)
      const movingRequests = requests.filter(r => r.fromX !== r.toX || r.fromY !== r.toY);
      if (movingRequests.length === 0) continue; // All were stationary

      // Check if any request would move into a position needed by losers
      const safeRequests = movingRequests.filter(req => {
        const targetPos = `${req.toX},${req.toY}`;
        return !neededPositions.has(targetPos);
      });

      if (safeRequests.length === 0) {
        // All moves would block losers, everyone stays
        losers.push(...movingRequests);
        continue;
      }

      // Sort by priority (density * speed)
      safeRequests.sort((a, b) => b.priority - a.priority);

      const winner = safeRequests[0];

      // Place winner
      nextGrid.set(tx, ty, winner.cell);
      processedSources.add(`${winner.fromX},${winner.fromY}`);
      winnersPlaced++;

      // Add remaining requests to losers list
      losers.push(...movingRequests.filter(r => r !== winner));
    }

    if (debug) {
      console.log(`  Phase 2c: Placed ${winnersPlaced} winners, created ${losers.length} losers`);
    }

    // Phase 3: Place losers at their source positions
    let losersPlaced = 0;
    let losersSkipped = 0;
    let losersSkippedAlreadyProcessed = 0;
    let losersSkippedOccupied = 0;
    const skippedPositions = new Set<string>();

    for (const loser of losers) {
      const sourceKey = `${loser.fromX},${loser.fromY}`;
      if (!processedSources.has(sourceKey)) {
        if (Cell.isEmpty(nextGrid.get(loser.fromX, loser.fromY))) {
          nextGrid.set(loser.fromX, loser.fromY, loser.cell);
          processedSources.add(sourceKey);
          losersPlaced++;
        } else {
          losersSkippedOccupied++;
          skippedPositions.add(sourceKey);
        }
      } else {
        losersSkippedAlreadyProcessed++;
      }
    }
    losersSkipped = losersSkippedAlreadyProcessed + losersSkippedOccupied;

    if (debug) {
      console.log(`  Phase 3: Placed ${losersPlaced} losers`);
      console.log(`           Skipped ${losersSkippedAlreadyProcessed} already processed`);
      console.log(`           Skipped ${losersSkippedOccupied} occupied (lost forever!)`);

      // Count cells in both grids
      let originalCount = 0;
      let nextCount = 0;
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (!Cell.isEmpty(grid.get(x, y))) originalCount++;
          if (!Cell.isEmpty(nextGrid.get(x, y))) nextCount++;
        }
      }

      if (originalCount !== nextCount) {
        console.log(`  ⚠️  Cell count mismatch! Original: ${originalCount}, Next: ${nextCount}`);
        console.log(`      Move requests: ${moveRequests.length}, Processed sources: ${processedSources.size}`);
        console.log(`      Lost cells: ${originalCount - nextCount}`);

        // Analyze which rows are affected
        if (skippedPositions.size > 0) {
          const rowCounts = new Map<number, number>();
          for (const pos of skippedPositions) {
            const [, y] = pos.split(',').map(Number);
            rowCounts.set(y, (rowCounts.get(y) || 0) + 1);
          }
          console.log(`      Cells with occupied sources by row:`);
          const sortedRows = Array.from(rowCounts.entries()).sort((a, b) => a[0] - b[0]);
          for (const [row, count] of sortedRows.slice(0, 10)) {
            console.log(`        Row ${row}: ${count} cells lost`);
          }
        }
      }
    }

    // Copy nextGrid back to grid
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        grid.set(x, y, nextGrid.get(x, y));
      }
    }
  }
}
