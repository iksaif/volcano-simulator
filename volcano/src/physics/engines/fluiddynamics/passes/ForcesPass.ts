// Forces pass - applies gravity, buoyancy, and viscosity

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import { MaterialState } from '../../../../core/Types';

export class ForcesPass {
  static execute(grid: Grid, gravity: number, dt: number): void {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (Cell.isEmpty(cell)) continue;

        const material = MaterialRegistry.get(Cell.getMaterialId(cell));

        // Skip anchored solids (connected to ground)
        if (Cell.isAnchored(cell)) continue;

        let vx = Cell.getVelocityX(cell);
        let vy = Cell.getVelocityY(cell);

        // Apply gravity
        vy += gravity * dt;

        // Buoyancy for hot fluids/gases
        if (material.state !== MaterialState.Solid) {
          const temp = Cell.getTemperature(cell);
          const thermalExp = material.thermalExpansion || 0;
          if (thermalExp > 0 && temp > 20) {
            const buoyancy = thermalExp * (temp - 20) * 0.1;
            vy -= buoyancy * gravity * dt;
          }
        }

        // Viscosity drag
        const viscosity = material.viscosity / 255;
        const drag = 1 - viscosity * 0.5;
        vx *= drag;
        vy *= drag;

        // Clamp velocities
        const maxVel = material.state === MaterialState.Gas ? 5 :
                       material.state === MaterialState.Liquid ? 3 : 2;
        vx = Math.max(-maxVel, Math.min(maxVel, vx));
        vy = Math.max(-maxVel, Math.min(maxVel, vy));

        grid.set(x, y, Cell.setVelocity(cell, vx, vy));
      }
    }
  }
}
