// Forces pass - applies gravity, buoyancy, and viscosity

import { Grid } from '../../../../core/Grid';
import { Cell } from '../../../../core/Cell';
import { MaterialRegistry } from '../../../../materials/MaterialRegistry';
import { MaterialState } from '../../../../core/Types';

import type { IPhysicsEnginePass } from "../../../IPhysicsEngine";
export class ForcesPass implements IPhysicsEnginePass {
  private gravity: number;

  constructor(gravity: number) {
      this.gravity = gravity;
    }

    execute(grid: Grid, dt: number): void {
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
        vy += this.gravity * dt;

        // Buoyancy for hot fluids/gases
        if (material.state !== MaterialState.Solid) {
          const temp = Cell.getTemperature(cell);
          const thermalExp = material.thermalExpansion || 0;
          // TODO: remove this temp check, compute buoyancy based on density difference.
          if (thermalExp > 0 && temp > 20) {
            const buoyancy = thermalExp * (temp - 20) * 0.1;
            vy -= buoyancy * this.gravity * dt;
          }
        }

        // TODO: The viscosity should drag us if our neighbors are of the 
        //  same material no? But also water gas flowing up in water
        //  should be dragged down. So maybe we only compute the drag based
        //  on where we want to go in the first place and our neighbors.

        // Viscosity drag
        //const viscosity = material.viscosity / 255;
        //const drag = 1 - viscosity * 0.5;
        //vx *= drag;
        //vy *= drag;


        grid.set(x, y, Cell.setVelocity(cell, vx, vy));
      }
    }
  }
}
